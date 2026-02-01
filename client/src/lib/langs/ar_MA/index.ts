import common from './common';
import auth from './auth';
import products from './products';
import cart from './cart';
import orders from './orders';
import profile from './profile';
import documents from './documents';
import notifications from './notifications';
import location from './location';

export default {
  ...common,
  ...auth,
  ...products,
  ...cart,
  ...orders,
  ...profile,
  ...documents,
  ...notifications,
  ...location,
};
