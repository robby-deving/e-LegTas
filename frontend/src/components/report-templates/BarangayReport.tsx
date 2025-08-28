// src/components/report-templates/BarangayReport.tsx
import React from 'react';
import legazpiLogo1 from '../../assets/legazpi-logo1.png';
import legazpiLogo2 from '../../assets/legazpi-logo2.jpg';

interface EvacueeData {
  familyHead: string;
  purok: string;
  male: number;
  female: number;
  total: number;
  infant: number;
  children: number;
  youth: number;
  adult: number;
  seniorCitizens: number;
  pwd: number;
  pregnant: number;
  lactating: number;
}

interface EvacuationCenter {
  name: string;
  evacuees: EvacueeData[];
}

interface BarangayReportProps {
  barangayName?: string;
  disasterEvent?: string;
  reportDate?: string;
  reportTime?: string;
  evacuationCenters?: EvacuationCenter[];
  logo1Src?: string;
  logo2Src?: string;
}

export default function BarangayReportTemplate({
  barangayName,
  disasterEvent,
  reportDate,
  reportTime,
  evacuationCenters,
  logo1Src = legazpiLogo1,
  logo2Src = legazpiLogo2,
}: BarangayReportProps) {
  const showNum = (v?: number | null) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? 0 : Number(v);

  const centers: EvacuationCenter[] = Array.isArray(evacuationCenters)
    ? evacuationCenters.map((c) => ({
        name: c?.name ?? '',
        evacuees: Array.isArray(c?.evacuees) ? c.evacuees : [],
      }))
    : [];

  const titleBarangay = barangayName || '—';
  const titleDisaster = disasterEvent || '—';
  const titleDate = reportDate || '—';
  const titleTime = reportTime || '—';

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
  };

  const calcSubtotal = (rows: EvacueeData[]) =>
    (rows || []).reduce(
      (acc, r) => ({
        families: acc.families + 1,
        male: acc.male + (r.male || 0),
        female: acc.female + (r.female || 0),
        total: acc.total + (r.total || 0),
        infant: acc.infant + (r.infant || 0),
        children: acc.children + (r.children || 0),
        youth: acc.youth + (r.youth || 0),
        adult: acc.adult + (r.adult || 0),
        seniorCitizens: acc.seniorCitizens + (r.seniorCitizens || 0),
        pwd: acc.pwd + (r.pwd || 0),
        pregnant: acc.pregnant + (r.pregnant || 0),
        lactating: acc.lactating + (r.lactating || 0),
      }),
      {
        families: 0,
        male: 0,
        female: 0,
        total: 0,
        infant: 0,
        children: 0,
        youth: 0,
        adult: 0,
        seniorCitizens: 0,
        pwd: 0,
        pregnant: 0,
        lactating: 0,
      }
    );

  const grandTotal = centers.reduce(
    (g, c) => {
      const s = calcSubtotal(c.evacuees || []);
      return {
        families: g.families + s.families,
        male: g.male + s.male,
        female: g.female + s.female,
        total: g.total + s.total,
        infant: g.infant + s.infant,
        children: g.children + s.children,
        youth: g.youth + s.youth,
        adult: g.adult + s.adult,
        seniorCitizens: g.seniorCitizens + s.seniorCitizens,
        pwd: g.pwd + s.pwd,
        pregnant: g.pregnant + s.pregnant,
        lactating: g.lactating + s.lactating,
      };
    },
    {
      families: 0,
      male: 0,
      female: 0,
      total: 0,
      infant: 0,
      children: 0,
      youth: 0,
      adult: 0,
      seniorCitizens: 0,
      pwd: 0,
      pregnant: 0,
      lactating: 0,
    }
  );

  return (
    <div className="report-template landscape bg-white p-2">
      {/* Header */}
      <div className="flex items-center justify-between my-4">
        <div className="w-20 h-20">
          {logo1Src && (
            <img
              src={logo1Src}
              alt="City of Legazpi Logo"
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          )}
        </div>

        <div className="text-center">
          <div className="text-xs">Republic of the Philippines</div>
          <div className="text-xs font-bold">City Government of Legazpi</div>
          <div className="text-sm underline font-bold p-2">{titleBarangay}</div>
          <div className="text-sm font-bold mt-4">
            EVACUATION DATA FOR <span className="uppercase">{titleDisaster}</span>
          </div>
          <div className="text-xs">
            as of {titleDate}
            {titleTime ? `, ${titleTime}` : ''}
          </div>
        </div>

        <div className="w-20 h-20">
          {logo2Src && (
            <img
              src={logo2Src}
              alt="City of Legazpi Seal"
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          )}
        </div>
      </div>

      {/* Table */}
      <table className="report-table w-full border-collapse border border-black text-xs">
        <thead>
          <tr>
            <th className="w-50 border border-black p-1">Evacuation Center/Site</th>
            <th className="w-32 border border-black p-1">Family Head</th>
            <th className="w-20 border border-black p-1">Purok</th>
            <th className="w-20 border border-black p-1">Total No. of<br />Male</th>
            <th className="w-20 border border-black p-1">Total No. of<br />Female</th>
            <th className="w-20 border border-black p-1">Total No. of<br />Individuals</th>
            <th className="w-20 border border-black p-1">Infant<br />(1 year old)</th>
            <th className="w-20 border border-black p-1">Children<br />(2-12 yrs. old)</th>
            <th className="w-20 border border-black p-1">Youth<br />(13-17 yrs. old)</th>
            <th className="w-20 border border-black p-1">Adult<br />(18-59 yrs. old)</th>
            <th className="w-20 border border-black p-1">Senior Citizens<br />(60+ yrs. old)</th>
            <th className="w-16 border border-black p-1">PWD</th>
            <th className="w-20 border border-black p-1">Pregnant<br />Woman</th>
            <th className="w-20 border border-black p-1">Lactating<br />Women</th>
          </tr>
        </thead>

        <tbody>
          {centers.length === 0 ? (
            <tr>
              <td className="border border-black p-1" colSpan={14}>No evacuation data available</td>
            </tr>
          ) : null}
        </tbody>

        {/* One <tbody> per EC group keeps rows+subtotal together across pages */}
        {centers.map((center, ci) => {
          const rows = Array.isArray(center.evacuees) ? center.evacuees : [];
          const displayRows =
            rows.length > 0
              ? rows
              : [{
                  familyHead: '', purok: '', male: 0, female: 0, total: 0,
                  infant: 0, children: 0, youth: 0, adult: 0,
                  seniorCitizens: 0, pwd: 0, pregnant: 0, lactating: 0,
                } as EvacueeData];

          const sub = calcSubtotal(displayRows);

          return (
            <tbody key={ci} className="center-group">
              {displayRows.map((evacuee, ri) => (
                <tr key={`${ci}-${ri}`}>
                  {ri === 0 && (
                    <td
                      rowSpan={displayRows.length + 1}
                      className="align-top font-bold border border-black p-1"
                    >
                      {center.name}
                    </td>
                  )}
                  <td className="border border-black p-1">{evacuee.familyHead}</td>
                  <td className="border border-black p-1 text-center">{evacuee.purok}</td>
                  <td className="border border-black p-1 text-center">{showNum(evacuee.male)}</td>
                  <td className="border border-black p-1 text-center">{showNum(evacuee.female)}</td>
                  <td className="border border-black p-1 text-center">{showNum(evacuee.total)}</td>
                  <td className="border border-black p-1 text-center">{showNum(evacuee.infant)}</td>
                  <td className="border border-black p-1 text-center">{showNum(evacuee.children)}</td>
                  <td className="border border-black p-1 text-center">{showNum(evacuee.youth)}</td>
                  <td className="border border-black p-1 text-center">{showNum(evacuee.adult)}</td>
                  <td className="border border-black p-1 text-center">{showNum(evacuee.seniorCitizens)}</td>
                  <td className="border border-black p-1 text-center">{showNum(evacuee.pwd)}</td>
                  <td className="border border-black p-1 text-center">{showNum(evacuee.pregnant)}</td>
                  <td className="border border-black p-1 text-center">{showNum(evacuee.lactating)}</td>
                </tr>
              ))}

              {/* Subtotal row (no comments/whitespace children inside <tr>) */}
              <tr className="font-bold bg-gray-100" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <td className="border border-black p-1 text-center">{showNum(sub.families)}</td>
                <td className="border border-black p-1 text-center">----</td>
                <td className="border border-black p-1 text-center">{showNum(sub.male)}</td>
                <td className="border border-black p-1 text-center">{showNum(sub.female)}</td>
                <td className="border border-black p-1 text-center">{showNum(sub.total)}</td>
                <td className="border border-black p-1 text-center">{showNum(sub.infant)}</td>
                <td className="border border-black p-1 text-center">{showNum(sub.children)}</td>
                <td className="border border-black p-1 text-center">{showNum(sub.youth)}</td>
                <td className="border border-black p-1 text-center">{showNum(sub.adult)}</td>
                <td className="border border-black p-1 text-center">{showNum(sub.seniorCitizens)}</td>
                <td className="border border-black p-1 text-center">{showNum(sub.pwd)}</td>
                <td className="border border-black p-1 text-center">{showNum(sub.pregnant)}</td>
                <td className="border border-black p-1 text-center">{showNum(sub.lactating)}</td>
              </tr>
              </tbody>
                );
                })}

              {/* Grand total (own tbody to avoid splitting) */}
              {centers.length > 0 && (
              <tbody>
              <tr className="font-bold bg-gray-200" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <td className="border border-black p-1">Total</td>
                <td className="border border-black p-1 text-center">{showNum(grandTotal.families)}</td>
                <td className="border border-black p-1 text-center">----</td>
                <td className="border border-black p-1 text-center">{showNum(grandTotal.male)}</td>
                <td className="border border-black p-1 text-center">{showNum(grandTotal.female)}</td>
                <td className="border border-black p-1 text-center">{showNum(grandTotal.total)}</td>
                <td className="border border-black p-1 text-center">{showNum(grandTotal.infant)}</td>
                <td className="border border-black p-1 text-center">{showNum(grandTotal.children)}</td>
                <td className="border border-black p-1 text-center">{showNum(grandTotal.youth)}</td>
                <td className="border border-black p-1 text-center">{showNum(grandTotal.adult)}</td>
                <td className="border border-black p-1 text-center">{showNum(grandTotal.seniorCitizens)}</td>
                <td className="border border-black p-1 text-center">{showNum(grandTotal.pwd)}</td>
                <td className="border border-black p-1 text-center">{showNum(grandTotal.pregnant)}</td>
                <td className="border border-black p-1 text-center">{showNum(grandTotal.lactating)}</td>
              </tr>
          </tbody>
        )}
      </table>
    </div>
  );
}
