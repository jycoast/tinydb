/**
 * Get the configuration file variable name
 * @param env
 */
export const getConfigFileName = (env: Record<string, any>) => {
  const name = (env.VITE_GLOB_APP_SHORT_NAME || '__APP').replace(/\s/g, '');
  return `__PRODUCTION__${name}__CONF__`;
};
