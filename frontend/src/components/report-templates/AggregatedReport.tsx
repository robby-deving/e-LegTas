// AggregatedReport.tsx
import React from 'react';
import legazpiLogo1 from '../../assets/legazpi-logo1.png';
import legazpiLogo2 from '../../assets/legazpi-logo2.jpg';

export interface AggregatedReportProps {
  disasterEvent?: string;
  reportDate?: string;
  reportTime?: string;
  evacuationCenters?: Array<{
    name: string;
    address: string;
    originBarangay: string;
    insideFamilies?: number | null;
    insidePersons?: number | null;
    outsideFamilies?: number | null;
    outsidePersons?: number | null;
  }>;
  logo1Src?: string;
  logo2Src?: string;
  /** Minimum number of rows to display for nice printing; blank rows will pad if needed. */
  minRows?: number;
}

export default function AggregatedReportTemplate({
  disasterEvent = '',
  reportDate = '',
  reportTime = '',
  evacuationCenters = [],
  logo1Src = legazpiLogo1,
  logo2Src = legazpiLogo2,
  minRows = 20,
}: AggregatedReportProps) {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Hide the broken image so the header stays clean
    e.currentTarget.style.display = 'none';
  };

  // create a padded list so the table always has at least `minRows` rows
  const centers = Array.isArray(evacuationCenters) ? evacuationCenters : [];
  const padCount = Math.max(0, minRows - centers.length);
  const padded = [
    ...centers,
    ...Array.from({ length: padCount }, () => ({
      name: '',
      address: '',
      originBarangay: '',
      insideFamilies: null,
      insidePersons: null,
      outsideFamilies: null,
      outsidePersons: null,
    })),
  ];

  // show empty string for null/undefined/0 to keep blanks on padded rows
  const show = (v?: number | null) => (v ? String(v) : '');

  return (
    <div className="report-template landscape bg-white p-2">
      {/* Header with Logos */}
      <div className="flex items-center justify-between my-4">
        <div className="w-20 h-20">
          {logo1Src ? (
            <img
              src={logo1Src}
              alt="City of Legazpi Logo"
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          ) : null}
        </div>

        <div className="text-center">
          <div className="text-xs">Republic of the Philippines</div>
          <div className="text-xs font-bold">City Government of Legazpi</div>
          <div className="text-sm font-bold mt-4">
            STATUS REPORT {disasterEvent ? `FOR ${disasterEvent}` : ''}
          </div>
          {(reportDate || reportTime) && (
            <div className="text-xs">
              as of {reportDate}{reportDate && reportTime ? ', ' : ''}{reportTime}
            </div>
          )}
        </div>

        <div className="w-20 h-20">
          {logo2Src ? (
            <img
              src={logo2Src}
              alt="City of Legazpi Logo"
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          ) : null}
        </div>
      </div>

      {/* Table */}
      <table className="report-table w-full border-collapse border border-black">
        <thead>
          <tr>
            <th rowSpan={3} className="w-48 border border-black p-1 text-xs">
              Name of Evacuation Center
            </th>
            <th rowSpan={3} className="w-48 border border-black p-1 text-xs">
              Address
            </th>
            <th rowSpan={3} className="w-32 border border-black p-1 text-xs">
              Origin of IDP&apos;s<br />Barangay Name
            </th>
            <th colSpan={4} className="text-center border border-black p-1 text-xs">
              Number of Displaced
            </th>
          </tr>
          <tr>
            <th colSpan={2} className="text-center border border-black p-1 text-xs">
              Inside EC&apos;s
            </th>
            <th colSpan={2} className="text-center border border-black p-1 text-xs">
              Outside EC&apos;s
            </th>
          </tr>
          <tr>
            <th className="w-20 border border-black p-1 text-xs">Families</th>
            <th className="w-20 border border-black p-1 text-xs">Persons</th>
            <th className="w-20 border border-black p-1 text-xs">Families</th>
            <th className="w-20 border border-black p-1 text-xs">Persons</th>
          </tr>
        </thead>
        <tbody>
          {padded.map((center, idx) => (
            <tr key={idx}>
              <td className="border border-black p-1 text-xs">{center.name}</td>
              <td className="border border-black p-1 text-xs">{center.address}</td>
              <td className="border border-black p-1 text-xs">{center.originBarangay}</td>
              <td className="border border-black p-1 text-xs text-center">{show(center.insideFamilies)}</td>
              <td className="border border-black p-1 text-xs text-center">{show(center.insidePersons)}</td>
              <td className="border border-black p-1 text-xs text-center">{show(center.outsideFamilies)}</td>
              <td className="border border-black p-1 text-xs text-center">{show(center.outsidePersons)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
