# FrontEndCache

统一前端浏览器缓存管理，支持 `cookie`、`localStorage`、`sessionStorage`。

## 文档


语法：`new FrontEndCache<ValueType>(key[, options]);`

### `key`

当前缓存对象的 `key`，可以通过 `options.encryKey` 对其加密。

### `options` 属性

参数|类型|必填|默认值|说明
:---:|:---:|:---:|:---|:---
type|`localStorage` \| `sessionStorage` \| `cookie`|❌|localStorage|类型
domain|string|❌|location.hostname|**仅仅** `type=cookie`<br/>**注意和 原生 `cookie` 的区分，默认不是当前 `path`**
domain|string|❌|/|同 `cookie` 的 `path` 配置
expires|number|❌|-|过期时间，默认单位 `seconds` <br/> 针对 `sessionStorage` 和 `cookie` 默认值为当前会话 <br/> 针对 `localStorage` 默认值为 永久
expiresUnit|`years` \| `months` \| `days` \| `hours` \| `minutes` \| `seconds`|❌|seconds|过期时间单位
secure|boolean|❌|false|**仅仅** `type=cookie`
serialize|boolean|❌|true|是否序通过 `JSON.stringify` 列化 `value` 数<br/>如果为 `cookie` 还会通过 `encodeURIComponent` 一次 `JSON.stringify` 后的数据<br/>**仅在 `value` 类型为 `string` 的时候可以禁用序列化**，但同样会调用 `encodeURIComponent`
encryKey|`(key: string) => string`|❌|-|加密 `key` 的函数<br/>**需要注意**如果 `type = 'cookie'`, 最终的 `key` 也会 `encodeURIComponent`

## 使用

``` typescript
/** cache.ts */

import FrontEndCache from 'front-end-cache';

export const accessToken = new FrontEndCache<string>('ACCESS_TOKEN', { type: 'cookie', serialize: false });

export const userinfoCache = new FrontEndCache<UserInfoModel>('PROJECTNAME_USERINFO_CACHE');

/** more cache */
```

``` typescript
import { userinfoCache } from 'utils/cache.ts';

userinfoCache.setItem({ id: 1, name: 'xxx' });

userinfoCache.getItem();
```