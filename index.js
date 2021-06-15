'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./dist/cjs/front-end-cache.min.js');
} else {
  module.exports = require('./dist/cjs/front-end-cache.js');
}
