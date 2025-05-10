export const toUnixTimestamp = (date: Date = new Date()): number => {
  return Math.floor(date.getTime() / 1000);
};

export const fromUnixTimestamp = (timestamp: number): Date => {
  return new Date(timestamp * 1000);
};