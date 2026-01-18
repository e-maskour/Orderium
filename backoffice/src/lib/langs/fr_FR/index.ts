import common from './common';
import auth from './auth';
import partners from './partners';
import products from './products';
import orders from './orders';
import invoices from './invoices';
import delivery from './delivery';
import notifications from './notifications';
import pos from './pos';
import configurations from './configurations';

export default {
  ...common,
  ...auth,
  ...partners,
  ...products,
  ...orders,
  ...invoices,
  ...delivery,
  ...notifications,
  ...pos,
  ...configurations,
};
