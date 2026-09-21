import "server-only";

import type { RowDataPacket } from "mysql2/promise";

import { getSrxDB } from "@/lib/srx-db";

export type SrxLadipageVisitStats = {
  eventId: string;
  pageViews: number | null;
  sessions: number;
  desktop: number;
  mobile: number;
  tablet: number;
  unknown: number;
};

export type SrxLadipageVisitsReport = {
  available: boolean;
  hasPageViews: boolean;
  byEventId: Record<string, SrxLadipageVisitStats>;
};

type VisitRow = RowDataPacket & {
  event_id: number | string;
  page_views: number | string | null;
  sessions: number | string;
  desktop: number | string;
  mobile: number | string;
  tablet: number | string;
  unknown: number | string;
};

export async function getSrxLadipageVisitsReport(): Promise<SrxLadipageVisitsReport> {
  const [columns] = await getSrxDB().query<Array<RowDataPacket & { column_name: string }>>(
    `SELECT COLUMN_NAME AS column_name
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ladipage_visit_sessions'`,
  );
  const columnNames = new Set(columns.map((column) => column.column_name));

  if (!columnNames.size) {
    return { available: false, hasPageViews: false, byEventId: {} };
  }

  const hasPageViews = columnNames.has("page_views");
  const [rows] = await getSrxDB().query<VisitRow[]>(
    `SELECT event_id,
            ${hasPageViews ? "SUM(page_views)" : "NULL"} AS page_views,
            COUNT(*) AS sessions,
            SUM(device_type = 'desktop') AS desktop,
            SUM(device_type = 'mobile') AS mobile,
            SUM(device_type = 'tablet') AS tablet,
            SUM(device_type = 'unknown') AS unknown
     FROM ladipage_visit_sessions
     GROUP BY event_id`,
  );

  return {
    available: true,
    hasPageViews,
    byEventId: Object.fromEntries(
      rows.map((row) => {
        const eventId = String(row.event_id);
        return [
          eventId,
          {
            eventId,
            pageViews: row.page_views === null ? null : Number(row.page_views),
            sessions: Number(row.sessions),
            desktop: Number(row.desktop),
            mobile: Number(row.mobile),
            tablet: Number(row.tablet),
            unknown: Number(row.unknown),
          },
        ];
      }),
    ),
  };
}
