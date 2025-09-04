// src/components/report-templates/DisaggregatedReport.tsx
import React from 'react';
import legazpiLogo1 from '../../assets/legazpi-logo1.png';
import legazpiLogo2 from '../../assets/legazpi-logo2.jpg';

interface EvacuationSiteData {
  barangay: string;
  evacuationCenter: string;
  families: number;
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

interface DisaggregatedReportProps {
  disasterEvent?: string;
  reportDate?: string;
  reportTime?: string;
  evacuationSites?: EvacuationSiteData[];
  logo1Src?: string;
  logo2Src?: string;
  showTotals?: boolean;
}

export default function DisaggregatedReportTemplate({
  disasterEvent,
  reportDate,
  reportTime,
  evacuationSites,
  logo1Src = legazpiLogo1,
  logo2Src = legazpiLogo2,
  showTotals = false,
}: DisaggregatedReportProps) {
  const showNum = (value?: number | null) => (value === 0 ? 0 : (value ?? ''));

  const sites: EvacuationSiteData[] = Array.isArray(evacuationSites)
    ? evacuationSites.map((s) => ({
        barangay: s?.barangay ?? '',
        evacuationCenter: s?.evacuationCenter ?? '',
        families: Number(s?.families) || 0,
        male: Number(s?.male) || 0,
        female: Number(s?.female) || 0,
        total: Number(s?.total) || 0,
        infant: Number(s?.infant) || 0,
        children: Number(s?.children) || 0,
        youth: Number(s?.youth) || 0,
        adult: Number(s?.adult) || 0,
        seniorCitizens: Number(s?.seniorCitizens) || 0,
        pwd: Number(s?.pwd) || 0,
        pregnant: Number(s?.pregnant) || 0,
        lactating: Number(s?.lactating) || 0,
      }))
    : [];

  const titleDisaster = disasterEvent || '—';
  const titleDate = reportDate || '—';
  const titleTime = reportTime || '—';

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
  };

  const totals = sites.reduce(
    (acc, site) => ({
      families: acc.families + (site.families || 0),
      male: acc.male + (site.male || 0),
      female: acc.female + (site.female || 0),
      total: acc.total + (site.total || 0),
      infant: acc.infant + (site.infant || 0),
      children: acc.children + (site.children || 0),
      youth: acc.youth + (site.youth || 0),
      adult: acc.adult + (site.adult || 0),
      seniorCitizens: acc.seniorCitizens + (site.seniorCitizens || 0),
      pwd: acc.pwd + (site.pwd || 0),
      pregnant: acc.pregnant + (site.pregnant || 0),
      lactating: acc.lactating + (site.lactating || 0),
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

  const displayRows: EvacuationSiteData[] =
    sites.length > 0
      ? sites
      : Array.from({ length: 18 }, () => ({
          barangay: '',
          evacuationCenter: '',
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
        }));

  return (
    <div className="report-template landscape bg-white p-2">
      {/* Header */}
      <div className="flex items-center justify-between my-4 print:break-inside-avoid">
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

      {/* Table (no <colgroup> to avoid React whitespace/hydration errors) */}
      <table
        className="report-table w-full border-collapse border border-black text-xs"
        style={{ tableLayout: 'fixed' }}
      >
        <thead>
          <tr>
            <th className="border border-black p-1" style={{ width: '12%' }}>
              Barangay
            </th>
            <th className="border border-black p-1" style={{ width: '20%' }}>
              Evacuation Center/Site
            </th>
            {/* 12 numeric columns ~5.66% each */}
            <th className="border border-black p-1" style={{ width: '5.66%' }}>
              Family
            </th>
            <th className="border border-black p-1" style={{ width: '5.66%' }}>
              Total No. of<br />Male
            </th>
            <th className="border border-black p-1" style={{ width: '5.66%' }}>
              Total No. of<br />Female
            </th>
            <th className="border border-black p-1" style={{ width: '5.66%' }}>
              Total No. of<br />Individuals
            </th>
            <th className="border border-black p-1" style={{ width: '5.66%' }}>
              Infant<br />(1 yr)
            </th>
            <th className="border border-black p-1" style={{ width: '5.66%' }}>
              Children<br />(2–12)
            </th>
            <th className="border border-black p-1" style={{ width: '5.66%' }}>
              Youth<br />(13–17)
            </th>
            <th className="border border-black p-1" style={{ width: '5.66%' }}>
              Adult<br />(18–59)
            </th>
            <th className="border border-black p-1" style={{ width: '5.66%' }}>
              Senior<br />Citizens<br />(60+)
            </th>
            <th className="border border-black p-1" style={{ width: '5.66%' }}>
              PWD
            </th>
            <th className="border border-black p-1" style={{ width: '5.66%' }}>
              Pregnant<br />Women
            </th>
            <th className="border border-black p-1" style={{ width: '5.66%' }}>
              Lactating<br />Women
            </th>
          </tr>
        </thead>

        <tbody>
          {displayRows.map((site, index) => (
            <tr key={index} className="print:break-inside-avoid">
              <td className="h-6 border border-black p-1">{site.barangay}</td>
              <td className="h-6 border border-black p-1">{site.evacuationCenter}</td>
              <td className="h-6 border border-black p-1 text-center">{showNum(site.families)}</td>
              <td className="h-6 border border-black p-1 text-center">{showNum(site.male)}</td>
              <td className="h-6 border border-black p-1 text-center">{showNum(site.female)}</td>
              <td className="h-6 border border-black p-1 text-center">{showNum(site.total)}</td>
              <td className="h-6 border border-black p-1 text-center">{showNum(site.infant)}</td>
              <td className="h-6 border border-black p-1 text-center">{showNum(site.children)}</td>
              <td className="h-6 border border-black p-1 text-center">{showNum(site.youth)}</td>
              <td className="h-6 border border-black p-1 text-center">{showNum(site.adult)}</td>
              <td className="h-6 border border-black p-1 text-center">{showNum(site.seniorCitizens)}</td>
              <td className="h-6 border border-black p-1 text-center">{showNum(site.pwd)}</td>
              <td className="h-6 border border-black p-1 text-center">{showNum(site.pregnant)}</td>
              <td className="h-6 border border-black p-1 text-center">{showNum(site.lactating)}</td>
            </tr>
          ))}

          {showTotals && sites.length > 0 && (
            <tr className="font-bold bg-gray-200 print:break-inside-avoid">
              <td className="border border-black p-1" colSpan={2}>TOTAL</td>
              <td className="border border-black p-1 text-center">{showNum(totals.families)}</td>
              <td className="border border-black p-1 text-center">{showNum(totals.male)}</td>
              <td className="border border-black p-1 text-center">{showNum(totals.female)}</td>
              <td className="border border-black p-1 text-center">{showNum(totals.total)}</td>
              <td className="border border-black p-1 text-center">{showNum(totals.infant)}</td>
              <td className="border border-black p-1 text-center">{showNum(totals.children)}</td>
              <td className="border border-black p-1 text-center">{showNum(totals.youth)}</td>
              <td className="border border-black p-1 text-center">{showNum(totals.adult)}</td>
              <td className="border border-black p-1 text-center">{showNum(totals.seniorCitizens)}</td>
              <td className="border border-black p-1 text-center">{showNum(totals.pwd)}</td>
              <td className="border border-black p-1 text-center">{showNum(totals.pregnant)}</td>
              <td className="border border-black p-1 text-center">{showNum(totals.lactating)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
