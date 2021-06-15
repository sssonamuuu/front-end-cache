export type FrontEndCacheType = 'localStorage' | 'sessionStorage' | 'cookie';

export type FrontEndCacheExpiresUnit = 'years' | 'months' | 'days' | 'hours' | 'minutes' | 'seconds' | 'milliseconds';

export interface SetItemOptions {
  /**
   * 同 `cookie` 的 `path` 配置
   *
   * @see {@link https://developer.mozilla.org/zh-CN/docs/Web/API/Document/cookie}
   *
   * **注意和 原生 `cookie` 的区分，默认不是当前 `path`**
   *
   * @default /
   */
  path?: string;

  /**
   * 同 `cookie` 的 `domain` 配置
   *
   * @see {@link https://developer.mozilla.org/zh-CN/docs/Web/API/Document/cookie}
   *
   * @default location.host
   */
  domain?: string;

  /**
   * 过期时间，默认单位 `milliseconds` ，可以通过 {@link SetItemOptions.expiresUnit} 配置
   *
   * 针对 `sessionStorage` 和 `cookie` 默认值为当前会话
   *
   * 针对 `localStorage` 默认值为 永久
   */
  expires?: number;

  /**
   * 过期时间单位
   *
   * @default milliseconds
   */
  expiresUnit?: FrontEndCacheExpiresUnit;

  /**
   * 仅仅 `cookie` 有效，是否在传递时仅支持 `https`
   *
   * @default false
   */
  secure?: boolean;
}

export interface SetItemOptionsWithValue<T> extends SetItemOptions {
  value: T;
}

export interface FrontEndCacheOptions extends SetItemOptions {
  type?: FrontEndCacheType;
  encryKey?(key: string): string;
}

const expiresUnitFuncMap = {
  years: 'FullYear',
  months: 'Month',
  days: 'Date',
  hours: 'Hours',
  minutes: 'Minutes',
  seconds: 'Seconds',
  milliseconds: 'Milliseconds',
} as const;

export default class FrontEndCache<T = unknown> {
  static defaults: FrontEndCacheOptions = {
    type: 'localStorage',
    path: '/',
    domain: location.host,
    expiresUnit: 'milliseconds',
    secure: false,
  };

  private key: string;

  private options: FrontEndCacheOptions;

  private get encryKey () {
    return this.options.encryKey?.(this.key) || this.key;
  }

  /** 返回过期时间的时间戳 */
  private getExpires (exp: number, expUnit: FrontEndCacheExpiresUnit = 'milliseconds'): number {
    const now = new Date();
    const fun = expiresUnitFuncMap[expUnit];
    now[`get${fun}`](now[`get${fun}`] + exp);
    return now.getTime();
  }

  /** `options` 中与 `config` 中同字段配置其优先级更高 */
  constructor (key: string, options?: FrontEndCacheOptions) {
    this.key = key;
    this.options = { ...FrontEndCache.defaults, ...options };
  }

  private setCookie (option: SetItemOptionsWithValue<T>) {
    const value = encodeURIComponent(JSON.stringify(option.value));

    let cookie = `${encodeURIComponent(this.encryKey)}=${value};`;
    cookie += `path=${option.path || '/'};`;
    cookie += `domain=${option.domain || location.host};`;
    if (option.expires) {
      cookie += `expires=${new Date(this.getExpires(option.expires, option.expiresUnit)).toUTCString()};`;
    }

    document.cookie = cookie;
  }

  private getCookie () {
    return decodeURIComponent(document.cookie.replace(new RegExp(`(?:(?:^|.*;)\\s*${encodeURIComponent(this.encryKey).replace(/[-.+*]/g, '\\$&')}\\s*\\=\\s*([^;]*).*$)|^.*$`), '$1')) || null;
  }

  private removeCookie () {
    document.cookie = `${encodeURIComponent(this.encryKey)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT${sDomain ? `; domain=${sDomain}` : ''}${sPath ? `; path=${sPath}` : ''}`;
  }

  setItem (options: SetItemOptionsWithValue<T>): T {
    const _options = { ...this.options, ...options };
    if (_options.type === 'cookie') {
      this.setCookie(_options);
      return _options.value;
    }

    return _options.type;
  }

  // removeItem () {

  // }
}

