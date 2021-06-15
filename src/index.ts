export type FrontEndCacheType = 'localStorage' | 'sessionStorage' | 'cookie';

export type FrontEndCacheExpiresUnit = 'years' | 'months' | 'days' | 'hours' | 'minutes' | 'seconds' | 'milliseconds';

export interface FrontEndCacheOptions<T = unknown> {

  /**
   * 同 `cookie` 的 `domain` 配置
   *
   * @see {@link https://developer.mozilla.org/zh-CN/docs/Web/API/Document/cookie}
   *
   * @default location.host
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
  expiresUnit: FrontEndCacheExpiresUnit;

  /**
   * 仅仅 `cookie` 有效，是否在传递时仅支持 `https`
   *
   * @default false
   */
  secure: boolean;

  type: FrontEndCacheType;

  /**
   * 自定义序列化字 `value` 数据
   *
   * 默认/`true`：通过 `JSON.stringify` 序列化数据
   *
   * 如果为 `cookie` 还会通过 `encodeURIComponent` 一次 `JSON.stringify` 后的数据
   *
   * **仅在 `value` 类型为 `string` 的时候可以禁用序列化**，但同样会 `encodeURIComponent`
   *
   * 一般用在部分后端约定好的 `cookie` 时，后端未序列化时使用
   */
  serialize?: T extends string ? boolean : true;

  /**
   * 加密 `key` 的函数，
   *
   * 需要注意如果 `type = 'cookie'`, 最终的 `key` 也会 `encodeURIComponent`
   */
  encryKey?: (key: string) => string;
}

export type FrontEndStorageValue<T> = [value: T, domain: string, path: string, expires?: number];

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
  private key: string;

  private options: FrontEndCacheOptions<T>;

  constructor (key: string, options: Partial<FrontEndCacheOptions<T>> = {}) {
    this.options = {
      domain: location.host,
      path: '/',
      expiresUnit: 'milliseconds',
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
    now[`get${fun}`](now[`get${fun}`] + this.options.expires);
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

    const _value: FrontEndStorageValue<T> = [value, this.options.domain, this.options.path];
    this.expiresTimeStamp && (_value[3] = this.expiresTimeStamp);

    window[this.options.type].setItem(this.key, this.serializeValue(_value));

    return value;
  }

  getItem (): T | null
  getItem (defaultValue: T): T
  getItem (defaultValue?: T): T | null {
    if (this.options.type === 'cookie') {
      return this.getCookie() ?? defaultValue ?? null;
    }

    const value = this.deserialization<FrontEndStorageValue<T>>(window[this.options.type].getItem(this.key));
    console.log(value);
    return value?.[0] ?? defaultValue ?? null;
  }

  removeItem () {
    this.removeCookie();
  }
}
