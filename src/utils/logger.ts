// Production logger - removes all console statements
export const logger = {
  log: process.env.NODE_ENV === 'development' ? console.log : () => {},
  error: process.env.NODE_ENV === 'development' ? console.error : () => {},
  warn: process.env.NODE_ENV === 'development' ? console.warn : () => {},
  info: process.env.NODE_ENV === 'development' ? console.info : () => {},
};

// Replace console methods in production
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.info = () => {};
}
