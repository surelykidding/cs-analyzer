// https://www.postgresql.org/docs/current/errcodes-appendix.html
export const PostgresqlErrorCode = {
  UniqueViolation: '23505',
  UndefinedTable: '42P01',
  UndefinedColumn: '42703',
} as const;

export type PostgresqlErrorCode = (typeof PostgresqlErrorCode)[keyof typeof PostgresqlErrorCode];
