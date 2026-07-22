'use strict';

Promise.all([import('./ui-v2-operations.js'), import('./ui-v2-shell.js')])
  .catch((error) => console.error('Clean interface failed to initialize.', error));
