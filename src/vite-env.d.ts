import type {KevlarApi} from './shared/types';

declare global {
  interface Window {
    kevlar: KevlarApi;
  }
}

export {};
