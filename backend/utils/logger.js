const write = (level, event, details = {}) => {
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...details,
  };
  console.log(JSON.stringify(payload));
};

export const logger = {
  info: (event, details) => write('info', event, details),
  warn: (event, details) => write('warn', event, details),
  error: (event, details) => write('error', event, details),
};
