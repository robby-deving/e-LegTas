// DisaggregatedReport.tsx
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
  // Normalize input to avoid runtime errors
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
    // Hide broken images gracefully
    e.currentTarget.style.display = 'none';
  };

  const calculateTotals = () =>
    sites.reduce(
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

  // Keep the page layout consistent for printing: show blank rows if no data
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

  const totals = calculateTotals();

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
          <div className="text-sm font-bold mt-4">EVACUATION DATA FOR {titleDisaster}</div>
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
            <th className="w-32 border border-black p-1">Barangay</th>
            <th className="w-48 border border-black p-1">Evacuation Center/Site</th>
            <th className="w-20 border border-black p-1">Family</th>
            <th className="w-20 border border-black p-1">
              Total No. of
              <br />
              Male
            </th>
            <th className="w-20 border border-black p-1">
              Total No. of
              <br />
              Female
            </th>
            <th className="w-20 border border-black p-1">
              Total No. of
              <br />
              Individuals
            </th>
            <th className="w-20 border border-black p-1">
              Infant
              <br />
              (1 year old)
            </th>
            <th className="w-20 border border-black p-1">
              Children
              <br />
              (2-12 yrs. old)
            </th>
            <th className="w-20 border border-black p-1">
              Youth
              <br />
              (13-17 yrs. old)
            </th>
            <th className="w-20 border border-black p-1">
              Adult
              <br />
              (18-59 yrs. old)
            </th>
            <th className="w-20 border border-black p-1">
              Senior
              <br />
              Citizens
              <br />
              (60+ yrs.)
            </th>
            <th className="w-16 border border-black p-1">PWD</th>
            <th className="w-20 border border-black p-1">
              Pregnant
              <br />
              Woman
            </th>
            <th className="w-20 border border-black p-1">
              Lactating
              <br />
              Women
            </th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((site, index) => (
            <tr key={index}>
              <td className="h-6 border border-black p-1">{site.barangay}</td>
              <td className="h-6 border border-black p-1">{site.evacuationCenter}</td>
              <td className="h-6 border border-black p-1 text-center">{site.families || ''}</td>
              <td className="h-6 border border-black p-1 text-center">{site.male || ''}</td>
              <td className="h-6 border border-black p-1 text-center">{site.female || ''}</td>
              <td className="h-6 border border-black p-1 text-center">{site.total || ''}</td>
              <td className="h-6 border border-black p-1 text-center">{site.infant || ''}</td>
              <td className="h-6 border border-black p-1 text-center">{site.children || ''}</td>
              <td className="h-6 border border-black p-1 text-center">{site.youth || ''}</td>
              <td className="h-6 border border-black p-1 text-center">{site.adult || ''}</td>
              <td className="h-6 border border-black p-1 text-center">
                {site.seniorCitizens || ''}
              </td>
              <td className="h-6 border border-black p-1 text-center">{site.pwd || ''}</td>
              <td className="h-6 border border-black p-1 text-center">{site.pregnant || ''}</td>
              <td className="h-6 border border-black p-1 text-center">{site.lactating || ''}</td>
            </tr>
          ))}

          {showTotals && sites.length > 0 && (
            <tr className="font-bold bg-gray-200">
              <td className="border border-black p-1" colSpan={2}>
                TOTAL
              </td>
              <td className="border border-black p-1 text-center">{totals.families}</td>
              <td className="border border-black p-1 text-center">{totals.male}</td>
              <td className="border border-black p-1 text-center">{totals.female}</td>
              <td className="border border-black p-1 text-center">{totals.total}</td>
              <td className="border border-black p-1 text-center">{totals.infant || ''}</td>
              <td className="border border-black p-1 text-center">{totals.children || ''}</td>
              <td className="border border-black p-1 text-center">{totals.youth || ''}</td>
              <td className="border border-black p-1 text-center">{totals.adult || ''}</td>
              <td className="border border-black p-1 text-center">
                {totals.seniorCitizens || ''}
              </td>
              <td className="border border-black p-1 text-center">{totals.pwd || ''}</td>
              <td className="border border-black p-1 text-center">{totals.pregnant || ''}</td>
              <td className="border border-black p-1 text-center">{totals.lactating || ''}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
