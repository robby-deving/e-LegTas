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
}

export default function AggregatedReportTemplate({
  disasterEvent = '',
  reportDate = '',
  reportTime = '',
  evacuationCenters = [],
  logo1Src = legazpiLogo1,
  logo2Src = legazpiLogo2,
}: AggregatedReportProps) {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
  };

  const centers = Array.isArray(evacuationCenters) ? evacuationCenters : [];

  // Totals (Inside ECs)
  const totals = centers.reduce(
    (acc, c) => {
      acc.insideFamilies += Number(c.insideFamilies ?? 0);
      acc.insidePersons  += Number(c.insidePersons ?? 0);
      return acc;
    },
    { insideFamilies: 0, insidePersons: 0 }
  );

const show = (v?: number | null) => (v === 0 ? '0' : (v == null ? '' : String(v)));

  return (
   <div className="report-template landscape bg-white p-[6mm]"> 
      {/* Header with Logos */}
      <div className="flex items-center justify-between mt-0 mb-2">
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
            STATUS REPORT <span className="uppercase">{disasterEvent ? `FOR ${disasterEvent}` : ''}</span>
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
          {centers.map((center, idx) => (
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

            {/* Totals row (Inside ECs) + Outside totals show dashes */}
            <tr>
              <td className="border border-black p-1 text-xs font-bold text-right" colSpan={3}>
                TOTAL
              </td>
              <td className="border border-black p-1 text-xs text-center font-bold">
                {totals.insideFamilies}
              </td>
              <td className="border border-black p-1 text-xs text-center font-bold">
                {totals.insidePersons}
              </td>
              <td className="border border-black p-1 text-xs text-center font-bold">----</td>
              <td className="border border-black p-1 text-xs text-center font-bold">----</td>
            </tr>
                    </tbody>
                  </table>
                </div>
              );
            }