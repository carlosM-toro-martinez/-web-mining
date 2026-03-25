import pino from "pino";

export const logger = pino({
  level: "info",
  transport: {
    targets: [
      {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
      {
        target: "pino/file",
        options: {
          destination: "./logs/app.log",
          mkdir: true,
        },
      },
    ],
  },
});
