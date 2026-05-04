import bodyParser from 'body-parser';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import helmet from 'helmet';
import hpp from 'hpp';
import createMemoryStore from 'memorystore';
import morgan from 'morgan';
import passport from 'passport';
import 'reflect-metadata';
import createFileStore from 'session-file-store';
import { Strategy, VerifiedCallback, Profile } from '@node-saml/passport-saml';
import {
  BASE_URL_PREFIX,
  CREDENTIALS,
  LOG_FORMAT,
  NODE_ENV,
  ORIGIN,
  PORT,
  SAML_CALLBACK_URL,
  SAML_ENTRY_SSO,
  SAML_FAILURE_REDIRECT,
  SAML_IDP_PUBLIC_CERT,
  SAML_ISSUER,
  SAML_LOGOUT_CALLBACK_URL,
  SAML_PRIVATE_KEY,
  SAML_PUBLIC_KEY,
  SECRET_KEY,
  SESSION_MEMORY,
} from '@config';
import { errorMiddleware } from '@middlewares/error.middleware';
import { User } from '@interfaces/users.interface';
import { logger, stream } from '@utils/logger';
import { isValidUrl } from '@utils/util';
import indexRouter from '@controllers/index.controller';
import userRouter from '@controllers/user.controller';
import operatonRouter from '@controllers/operaton.controller';

const corsWhitelist = (ORIGIN || '').split(',').map(o => o.trim());

const sessionTTL = 4 * 24 * 60 * 60; // 4 days
const sessionStore = SESSION_MEMORY
  ? new (createMemoryStore(session))({ checkPeriod: sessionTTL * 1000 })
  : new (createFileStore(session))({ ttl: sessionTTL, path: './data/sessions' });

passport.serializeUser((user, done) => done(null, user as Record<string, unknown>));
passport.deserializeUser((user, done) => done(null, user as Express.User));

const samlStrategy = new Strategy(
  {
    disableRequestedAuthnContext: true,
    identifierFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient',
    callbackUrl: SAML_CALLBACK_URL!,
    entryPoint: SAML_ENTRY_SSO!,
    privateKey: SAML_PRIVATE_KEY!,
    idpCert: SAML_IDP_PUBLIC_CERT!,
    issuer: SAML_ISSUER!,
    wantAssertionsSigned: false,
    wantAuthnResponseSigned: false,
    acceptedClockSkewMs: 1000,
    audience: false,
    logoutCallbackUrl: SAML_LOGOUT_CALLBACK_URL!,
  },
  // signonVerify — VerifyWithoutRequest: (profile | null, done) => void.
  // Parameter type is annotated explicitly so TypeScript picks the 2-arg
  // overload instead of inferring the 3-arg (req, profile, done) one.
  // SAML attributes come through as `unknown` via Profile's index signature,
  // so each one needs a `typeof` narrow before use.
  (profile: Profile | null, done: VerifiedCallback) => {
    if (!profile) {
      return done({ name: 'SAML_MISSING_PROFILE', message: 'Missing SAML profile' });
    }
    const givenName = typeof profile.givenName === 'string' ? profile.givenName : undefined;
    const surname = typeof profile.surname === 'string' ? profile.surname : undefined;
    const userId = typeof profile.userId === 'string' ? profile.userId : undefined;
    const username = typeof profile.username === 'string' ? profile.username : undefined;
    if (!givenName || !surname || !userId) {
      return done({ name: 'SAML_MISSING_ATTRIBUTES', message: 'Missing profile attributes' });
    }
    const user: User = {
      userId,
      username,
      name: `${givenName} ${surname}`,
      givenName,
      surname,
    };
    done(null, user as unknown as Record<string, unknown>);
  },
  // logoutVerify — same signature; we don't run any extra work on SLO, just accept.
  (_profile: Profile | null, done: VerifiedCallback) => done(null, {}),
);

export class App {
  readonly app: express.Application;
  readonly env: string;
  readonly port: number;

  constructor() {
    this.app = express();
    this.env = NODE_ENV || 'development';
    this.port = parseInt(PORT || '3000', 10);

    this.initializeMiddlewares();
    this.initializeSamlRoutes();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  listen(): void {
    this.app.listen(this.port, () => {
      logger.info(`================================`);
      logger.info(`= ENV: ${this.env}`);
      logger.info(`= App listening on port ${this.port}`);
      logger.info(`================================`);
    });
  }

  private initializeMiddlewares(): void {
    this.app.use(morgan(LOG_FORMAT || 'combined', { stream }));
    this.app.use(hpp());
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(cookieParser());

    this.app.use(
      session({
        secret: SECRET_KEY!,
        resave: false,
        saveUninitialized: false,
        store: sessionStore,
        cookie: {
          httpOnly: true,
          secure: NODE_ENV === 'production',
          sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        },
      }),
    );

    this.app.use(passport.initialize());
    this.app.use(passport.session());
    passport.use('saml', samlStrategy);

    this.app.use(
      cors({
        credentials: CREDENTIALS,
        origin: (origin, callback) => {
          if (!origin || corsWhitelist.includes(origin) || corsWhitelist.includes('*')) {
            callback(null, true);
          } else if (this.env === 'development') {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
      }),
    );
  }

  private initializeSamlRoutes(): void {
    const prefix = BASE_URL_PREFIX || '/api';

    // Initiate SAML login. Optional ?successRedirect=... rides through as RelayState.
    this.app.get(
      `${prefix}/saml/login`,
      (req, _res, next) => {
        if (req.query.successRedirect) req.query.RelayState = req.query.successRedirect;
        if (req.query.failureRedirect) req.query.RelayState = `${req.query.RelayState},${req.query.failureRedirect}`;
        next();
      },
      (req, res, next) => {
        passport.authenticate('saml', { failureRedirect: SAML_FAILURE_REDIRECT })(req, res, next);
      },
    );

    // SP metadata for IdP onboarding.
    this.app.get(`${prefix}/saml/metadata`, (_req, res) => {
      res.type('application/xml');
      const metadata = samlStrategy.generateServiceProviderMetadata(SAML_PUBLIC_KEY!, SAML_PUBLIC_KEY!);
      res.status(200).send(metadata);
    });

    // SP-initiated logout.
    this.app.get(
      `${prefix}/saml/logout`,
      (req, _res, next) => {
        if (req.query.successRedirect) req.query.RelayState = req.query.successRedirect;
        next();
      },
      (req, res, next) => {
        const successRedirect = req.query.successRedirect as string;
        samlStrategy.logout(req as any, () => {
          req.logout(err => {
            if (err) return next(err);
            res.redirect(successRedirect || (ORIGIN || '/').split(',')[0]);
          });
        });
      },
    );

    // IdP-initiated logout response.
    this.app.get(`${prefix}/saml/logout/callback`, bodyParser.urlencoded({ extended: false }), (req, res, next) => {
      req.logout(err => {
        if (err) return next(err);
        const urls = (req.body?.RelayState || '').split(',');
        const fallback = (ORIGIN || '/').split(',')[0];
        const target = isValidUrl(urls[0]) ? urls[0] : fallback;
        res.redirect(target);
      });
    });

    // Rate-limit the callback to throttle credential-stuffing-style abuse.
    const samlLoginRateLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

    this.app.post(`${prefix}/saml/login/callback`, samlLoginRateLimiter, bodyParser.urlencoded({ extended: false }), (req, res, next) => {
      const urls = (req.body?.RelayState || '').split(',');
      const successRedirect = isValidUrl(urls[0]) ? new URL(urls[0]) : new URL((ORIGIN || '/').split(',')[0]);
      const failureRedirect = isValidUrl(urls[1]) ? new URL(urls[1]) : successRedirect;

      passport.authenticate('saml', (err: any, user: User | false) => {
        if (err) {
          const q = new URLSearchParams(failureRedirect.searchParams);
          q.append('failMessage', err?.name || 'SAML_UNKNOWN_ERROR');
          failureRedirect.search = q.toString();
          return res.redirect(failureRedirect.toString());
        }
        if (!user) {
          const q = new URLSearchParams(failureRedirect.searchParams);
          q.append('failMessage', 'NO_USER');
          failureRedirect.search = q.toString();
          return res.redirect(failureRedirect.toString());
        }
        req.login(user, loginErr => {
          if (loginErr) {
            const q = new URLSearchParams(failureRedirect.searchParams);
            q.append('failMessage', 'SAML_UNKNOWN_ERROR');
            failureRedirect.search = q.toString();
            return res.redirect(failureRedirect.toString());
          }
          return req.session.save(() => res.redirect(successRedirect.toString()));
        });
      })(req, res, next);
    });
  }

  private initializeRoutes(): void {
    const prefix = BASE_URL_PREFIX || '/api';
    this.app.use(prefix, indexRouter);
    this.app.use(prefix, userRouter);
    this.app.use(`${prefix}/operaton`, operatonRouter);
  }

  private initializeErrorHandling(): void {
    this.app.use(errorMiddleware);
  }
}
