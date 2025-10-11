/** @type {import('next').NextConfig} */
module.exports = {
  async redirects() {
    return [
      {
        source: '/categories',
        destination: '/menu/categories',
        permanent: true,
      },
      {
        source: '/items',
        destination: '/menu/items',
        permanent: true,
      },
      {
        source: '/pricing',
        destination: '/menu/pricing',
        permanent: true,
      },
      {
        source: '/users',
        destination: '/settings/users',
        permanent: true,
      },
      {
        source: '/audit',
        destination: '/settings/audit',
        permanent: true,
      },
    ];
  },
};
