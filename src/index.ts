export type FrontEndCacheType = 'localStorage' | 'sessionStorage' | 'cookie';

export type FrontEndCacheExpiresUnit = 'years' | 'months' | 'days' | 'hours' | 'minutes' | 'seconds';

export interface FrontEndCacheOptions<T = unknown> {

  /**
   * 仅仅 `type=cookie`
   *
   * @see {@link https://developer.mozilla.org/zh-CN/docs/Web/API/Document/cookie}
   *
   * @default location.hostname
   */
  domain: string;

  /**
   * 同 `cookie` 的 `path` 配置
   *
   * @see {@link https://developer.mozilla.org/zh-CN/docs/Web/API/Document/cookie}
   *
   * **注意和 原生 `cookie` 的区分，默认不是当前 `path`**
   *
   * @default /
   */
  path: string;

  /**
   * 过期时间，默认单位 `seconds` ，可以通过 {@link SetItemOptions.expiresUnit} 配置
   *
   * 针对 `sessionStorage` 和 `cookie` 默认值为当前会话
   *
   * 针对 `localStorage` 默认值为 永久
   */
  expires?: number;

  /**
   * 过期时间单位
   *
   * @default seconds
   */
  expiresUnit: FrontEndCacheExpiresUnit;

  /**
   * 仅仅 `type=cookie`
   *
   * @default false
   */
  secure: boolean;

  type: FrontEndCacheType;

  /**
   * 是否序通过 `JSON.stringify` 列化 `value` 数据
   *
   * 如果为 `cookie` 还会通过 `encodeURIComponent` 一次 `JSON.stringify` 后的数据
   *
   * **仅在 `value` 类型为 `string` 的时候可以禁用序列化**，但同样会调用 `encodeURIComponent`
   *
   * @default true
   */
  serialize?: T extends string ? boolean : true;

  /**
   * 加密 `key` 的函数，
   *
   * 需要注意如果 `type = 'cookie'`, 最终的 `key` 也会 `encodeURIComponent`
   */
  encryKey?: (key: string) => string;
}

export type FrontEndStorageValue<T> = [value: T, path: string, expires?: number];

const expiresUnitFuncMap = {
  years: 'FullYear',
  months: 'Month',
  days: 'Date',
  hours: 'Hours',
  minutes: 'Minutes',
  seconds: 'Seconds',
} as const;

export default class FrontEndCache<T = unknown> {
  private key: string;

  private options: FrontEndCacheOptions<T>;

  constructor (key: string, options: Partial<FrontEndCacheOptions<T>> = {}) {
    this.options = {
      domain: location.hostname,
      path: '/',
      expiresUnit: 'seconds',
      secure: false,
      type: 'localStorage',
      ...options,
    };

    this.key = this.options.encryKey?.(key) || key;

    if (this.options.type === 'cookie') {
      this.key = encodeURIComponent(key);
    }
  }

  private get expiresTimeStamp (): number | null {
    if (typeof this.options.expires !== 'number') {
      return null;
    }

    const now = new Date();
    const fun = expiresUnitFuncMap[this.options.expiresUnit];
    now[`set${fun}`](now[`get${fun}`]() + this.options.expires);
    return now.getTime();
  }

  private serializeValue (value: unknown): string {
    let _value;
    if (this.options.serialize === false) {
      _value = `${value}`;
    } else {
      _value = JSON.stringify(value);
    }

    /** `cookie` 始终进行一次 `encodeURIComponent` 避免特殊字符 */
    if (this.options.type === 'cookie') {
      _value = encodeURIComponent(_value);
    }

    return _value;
  }

  private deserialization<V> (value?: string | null): V | null {
    try {
      let _value: string = value ?? '';

      /** `cookie` 优先解码，然后直接返回 */
      if (this.options.type === 'cookie') {
        _value = decodeURIComponent(_value);
      }

      return this.options.serialize === false ? _value : JSON.parse(_value);
    } catch {
      return null;
    }
  }

  private setCookie (value: T) {
    let cookie = `${this.key}=${this.serializeValue(value)};`;
    cookie += `path=${this.options.path};`;
    cookie += `domain=${this.options.domain};`;

    if (this.expiresTimeStamp) {
      cookie += `expires=${new Date(this.expiresTimeStamp).toUTCString()};`;
    }

    document.cookie = cookie;
  }

  private getCookie (): T | null {
    const value = document.cookie.replace(new RegExp(`(?:(?:^|.*;)\\s*${this.key.replace(/[-.+*]/g, '\\$&')}\\s*\\=\\s*([^;]*).*$)|^.*$`), '$1');
    return this.deserialization<T>(value);
  }

  private removeCookie () {
    document.cookie = `${this.key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=${this.options.domain};path=${this.options.path}`;
  }

  setItem (value: T): T {
    if (this.options.type === 'cookie') {
      this.setCookie(value);
      return value;
    }

    const _value: FrontEndStorageValue<T> = [value, this.options.path];
    this.expiresTimeStamp && (_value[2] = this.expiresTimeStamp);

    window[this.options.type].setItem(this.key, this.serializeValue(_value));

    return value;
  }

  getItem (): T | null
  getItem (defaultValue: T): T
  getItem (defaultValue?: T): T | null {
    let _value: T | null = null;

    if (this.options.type === 'cookie') {
      _value = this.getCookie();
    } else {
      const res = this.deserialization<FrontEndStorageValue<T>>(window[this.options.type].getItem(this.key));

      if (res && location.pathname.startsWith(res[1]) && (!res[2] || new Date(res[2]).getTime() - Date.now() >= 0)) {
        _value = res[0];
      }
    }

    return _value ?? defaultValue ?? null;
  }

  removeItem () {
    if (this.options.type === 'cookie') {
      this.removeCookie();
    } else {
      window[this.options.type].removeItem(this.key);
    }
  }
}
