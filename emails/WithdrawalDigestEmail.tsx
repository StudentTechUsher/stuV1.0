/**
 * Assumptions:
 * - React email component (can be rendered to HTML or previewed)
 * - Uses design tokens via inline styles
 * - Displays weekly withdrawal digest for an advisor
 */

'use client';

import React from 'react';
import type { AdvisorDigest } from '@/lib/jobs/withdrawalDigest';
import { fmtDate } from '@/utils/date';

interface WithdrawalDigestEmailProps {
  digest: AdvisorDigest;
}

export default function WithdrawalDigestEmail({
  digest,
}: WithdrawalDigestEmailProps) {
  const { advisor, window, totals, rows } = digest;

  const topMajors = Object.entries(totals.majors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div
      style={{
        fontFamily: 'Inter, sans-serif',
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        color: '#0a1f1a',
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: '#12F987',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
          Weekly Withdrawal Report
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#0a1f1a' }}>
          {fmtDate(window.startISO)} – {fmtDate(window.endISO)}
        </p>
      </div>

      {/* Summary */}
      <div style={{ padding: '24px' }}>
        <p style={{ fontSize: '16px', marginBottom: '16px' }}>
          Dear {advisor.name},
        </p>
        <p style={{ fontSize: '16px', marginBottom: '24px' }}>
          You have <strong>{totals.count}</strong> withdrawal
          {totals.count !== 1 ? 's' : ''} after the add/drop deadline this week
          in your scope ({advisor.scope}).
        </p>

        {topMajors.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              Top Majors:
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {topMajors.map(([majorId, count]) => (
                <li key={majorId} style={{ marginBottom: '4px', fontSize: '14px' }}>
                  {majorId}: {count} withdrawal{count !== 1 ? 's' : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Table */}
        {rows.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f4f4f5', textAlign: 'left' }}>
                  <th style={{ padding: '8px', borderBottom: '2px solid #e4e4e7' }}>
                    Student
                  </th>
                  <th style={{ padding: '8px', borderBottom: '2px solid #e4e4e7' }}>
                    Major
                  </th>
                  <th style={{ padding: '8px', borderBottom: '2px solid #e4e4e7' }}>
                    Course
                  </th>
                  <th style={{ padding: '8px', borderBottom: '2px solid #e4e4e7' }}>
                    Credits
                  </th>
                  <th style={{ padding: '8px', borderBottom: '2px solid #e4e4e7' }}>
                    Instructor
                  </th>
                  <th style={{ padding: '8px', borderBottom: '2px solid #e4e4e7' }}>
                    Term
                  </th>
                  <th style={{ padding: '8px', borderBottom: '2px solid #e4e4e7' }}>
                    Withdrawn
                  </th>
                  <th style={{ padding: '8px', borderBottom: '2px solid #e4e4e7' }}>
                    Days After
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f4f4f5',
                    }}
                  >
                    <td style={{ padding: '8px', borderBottom: '1px solid #e4e4e7' }}>
                      {row.student.name}
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #e4e4e7' }}>
                      {row.student.majorId}
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #e4e4e7' }}>
                      {row.course.code} ({row.course.section})
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #e4e4e7' }}>
                      {row.course.credits}
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #e4e4e7' }}>
                      {row.course.instructor}
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #e4e4e7' }}>
                      {row.course.term}
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #e4e4e7' }}>
                      {fmtDate(row.actionAtISO)}
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #e4e4e7' }}>
                      {row.daysAfterDeadline}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ fontSize: '14px', color: '#71717a' }}>
            No withdrawals to report.
          </p>
        )}

        {/* CTAs */}
        <div
          style={{
            marginTop: '32px',
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
          }}
        >
          <a
            href="#"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: '#12F987',
              color: '#0a1f1a',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: 600,
            }}
          >
            Open in{' '}
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/stu_icon_black.png"
                alt="stu"
                style={{ width: '20px', height: '20px' }}
              />
              <span style={{ fontWeight: 800, fontSize: '1.15em', lineHeight: 1, marginLeft: 0.5 }}>
                stu.
              </span>
            </span>
          </a>
          <a
            href="#"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#f4f4f5',
              color: '#0a1f1a',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: 600,
            }}
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          backgroundColor: '#f4f4f5',
          padding: '16px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#71717a',
        }}
      >
        <p style={{ margin: 0 }}>
          This is an automated weekly report. Please do not reply to this email.
        </p>
      </div>
    </div>
  );
}
