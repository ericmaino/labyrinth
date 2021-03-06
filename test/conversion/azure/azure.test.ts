import 'mocha';

import allocator from './address_allocator.test';
import azureId from './azure_id.test';
import converters from './converters.test';
import shortener from './name_shortener.test';
import walk from './walk.test';
import synthetics from './sythesized_resources.test';
import normalization from './normalization.test';

describe('Azure', () => {
  allocator();
  azureId();
  shortener();
  walk();
  converters();
  synthetics();
  normalization();
});
