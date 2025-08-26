// BarangayReport.tsx
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
  // Preserve 0, blank only if null/undefined
  const showNum = (value?: number | null) => (value === 0 ? 0 : (value ?? ''));

  // Make sure we always work with arrays
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

  const calculateSubtotal = (evacuees: EvacueeData[]) => {
    return (evacuees || []).reduce(
      (acc, evacuee) => ({
        families: acc.families + 1,
        male: acc.male + (evacuee.male || 0),
        female: acc.female + (evacuee.female || 0),
        total: acc.total + (evacuee.total || 0),
        infant: acc.infant + (evacuee.infant || 0),
        children: acc.children + (evacuee.children || 0),
        youth: acc.youth + (evacuee.youth || 0),
        adult: acc.adult + (evacuee.adult || 0),
        seniorCitizens: acc.seniorCitizens + (evacuee.seniorCitizens || 0),
        pwd: acc.pwd + (evacuee.pwd || 0),
        pregnant: acc.pregnant + (evacuee.pregnant || 0),
        lactating: acc.lactating + (evacuee.lactating || 0),
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
  };

  const calculateGrandTotal = () => {
    return centers.reduce(
      (grand, center) => {
        const subtotal = calculateSubtotal(center.evacuees || []);
        return {
          families: grand.families + subtotal.families,
          male: grand.male + subtotal.male,
          female: grand.female + subtotal.female,
          total: grand.total + subtotal.total,
          infant: grand.infant + subtotal.infant,
          children: grand.children + subtotal.children,
          youth: grand.youth + subtotal.youth,
          adult: grand.adult + subtotal.adult,
          seniorCitizens: grand.seniorCitizens + subtotal.seniorCitizens,
          pwd: grand.pwd + subtotal.pwd,
          pregnant: grand.pregnant + subtotal.pregnant,
          lactating: grand.lactating + subtotal.lactating,
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
  };

  const grandTotal = calculateGrandTotal();

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
              Senior Citizens
              <br />
              (60+ yrs. old)
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
          {centers.length === 0 ? (
            <tr>
              <td className="border border-black p-1" colSpan={14}>
                No evacuation data available
              </td>
            </tr>
          ) : (
            centers.map((center, centerIndex) => {
              const rows = Array.isArray(center.evacuees) ? center.evacuees : [];
              const subtotal = calculateSubtotal(rows);

              // If a center has no evacuees, still show a single empty line + subtotal row
              const displayRows = rows.length > 0 ? rows : [{ 
                familyHead: '', purok: '', male: 0, female: 0, total: 0,
                infant: 0, children: 0, youth: 0, adult: 0,
                seniorCitizens: 0, pwd: 0, pregnant: 0, lactating: 0
              }];

              return (
                <React.Fragment key={centerIndex}>
                  {displayRows.map((evacuee, evacueeIndex) => (
                    <tr key={`${centerIndex}-${evacueeIndex}`}>
                      {evacueeIndex === 0 && (
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

                  {/* Subtotal Row */}
<tr className="font-bold bg-gray-100">
  <td className="border border-black p-1 text-center">{subtotal.families || ''}</td>
  <td className="border border-black p-1 text-center">----</td> {/* Purok */}
  <td className="border border-black p-1 text-center">{subtotal.male || ''}</td>
  <td className="border border-black p-1 text-center">{subtotal.female || ''}</td>
  <td className="border border-black p-1 text-center">{subtotal.total || ''}</td>
  <td className="border border-black p-1 text-center">{subtotal.infant || ''}</td>
  <td className="border border-black p-1 text-center">{subtotal.children || ''}</td>
  <td className="border border-black p-1 text-center">{subtotal.youth || ''}</td>
  <td className="border border-black p-1 text-center">{subtotal.adult || ''}</td>
  <td className="border border-black p-1 text-center">{subtotal.seniorCitizens || ''}</td>
  <td className="border border-black p-1 text-center">{subtotal.pwd || ''}</td>
  <td className="border border-black p-1 text-center">{subtotal.pregnant || ''}</td>
  <td className="border border-black p-1 text-center">{subtotal.lactating || ''}</td>
</tr>

                </React.Fragment>
              );
            })
          )}

          {/* Grand Total Row */}
          {centers.length > 0 && (
<tr className="font-bold bg-gray-200">
  <td className="border border-black p-1">Total</td>
  <td className="border border-black p-1 text-center">{grandTotal.families || ''}</td>
  <td className="border border-black p-1 text-center">----</td> {/* Purok */}
  <td className="border border-black p-1 text-center">{grandTotal.male || ''}</td>
  <td className="border border-black p-1 text-center">{grandTotal.female || ''}</td>
  <td className="border border-black p-1 text-center">{grandTotal.total || ''}</td>
  <td className="border border-black p-1 text-center">{grandTotal.infant || ''}</td>
  <td className="border border-black p-1 text-center">{grandTotal.children || ''}</td>
  <td className="border border-black p-1 text-center">{grandTotal.youth || ''}</td>
  <td className="border border-black p-1 text-center">{grandTotal.adult || ''}</td>
  <td className="border border-black p-1 text-center">{grandTotal.seniorCitizens || ''}</td>
  <td className="border border-black p-1 text-center">{grandTotal.pwd || ''}</td>
  <td className="border border-black p-1 text-center">{grandTotal.pregnant || ''}</td>
  <td className="border border-black p-1 text-center">{grandTotal.lactating || ''}</td>
</tr>

          )}
        </tbody>
      </table>
    </div>
  );
}
