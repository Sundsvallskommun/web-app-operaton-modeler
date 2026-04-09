import { App } from '@/app';
import { validateEnv } from '@utils/validateEnv';

validateEnv();

new App().listen();
