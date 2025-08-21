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

// Sample data for demonstration
const sampleEvacuationSites: EvacuationSiteData[] = [
  {
    barangay: "Barangay 9 - Pinaric",
    evacuationCenter: "Pinaric Elementary School",
    families: 5,
    male: 14,
    female: 12,
    total: 26,
    infant: 2,
    children: 7,
    youth: 5,
    adult: 10,
    seniorCitizens: 2,
    pwd: 1,
    pregnant: 2,
    lactating: 2
  },
  {
    barangay: "Barangay 9 - Pinaric",
    evacuationCenter: "Barangay Hall Multi-Purpose Center",
    families: 3,
    male: 7,
    female: 7,
    total: 14,
    infant: 1,
    children: 3,
    youth: 2,
    adult: 6,
    seniorCitizens: 2,
    pwd: 1,
    pregnant: 1,
    lactating: 1
  },
  {
    barangay: "Barangay 3 - Centro",
    evacuationCenter: "Sacred Heart Church",
    families: 8,
    male: 15,
    female: 15,
    total: 30,
    infant: 3,
    children: 8,
    youth: 6,
    adult: 11,
    seniorCitizens: 2,
    pwd: 0,
    pregnant: 2,
    lactating: 3
  },
  {
    barangay: "Barangay 12 - Cabangan",
    evacuationCenter: "Legazpi Sports Complex",
    families: 25,
    male: 44,
    female: 45,
    total: 89,
    infant: 8,
    children: 25,
    youth: 18,
    adult: 32,
    seniorCitizens: 6,
    pwd: 2,
    pregnant: 5,
    lactating: 7
  },
  {
    barangay: "Barangay 15 - Rawis",
    evacuationCenter: "Aquinas University Gymnasium",
    families: 18,
    male: 32,
    female: 32,
    total: 64,
    infant: 6,
    children: 18,
    youth: 12,
    adult: 24,
    seniorCitizens: 4,
    pwd: 1,
    pregnant: 4,
    lactating: 5
  },
  {
    barangay: "Barangay 7 - Bonot",
    evacuationCenter: "Bonot Elementary School",
    families: 12,
    male: 18,
    female: 20,
    total: 38,
    infant: 4,
    children: 12,
    youth: 8,
    adult: 12,
    seniorCitizens: 2,
    pwd: 1,
    pregnant: 2,
    lactating: 3
  },
  {
    barangay: "Barangay 5 - Bitano",
    evacuationCenter: "Bitano Covered Court",
    families: 10,
    male: 16,
    female: 14,
    total: 30,
    infant: 2,
    children: 8,
    youth: 6,
    adult: 12,
    seniorCitizens: 2,
    pwd: 0,
    pregnant: 1,
    lactating: 2
  }
];

export default function DisaggregatedReportTemplate({
  disasterEvent = "TROPICAL STORM KRISTINE",
  reportDate = "31 October 2024",
  reportTime = "5 PM",
  evacuationSites = sampleEvacuationSites,
  logo1Src = legazpiLogo1,
  logo2Src = legazpiLogo2, 
  showTotals = false
}: DisaggregatedReportProps) {

  // Error handling for missing data
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.warn('Failed to load image:', e.currentTarget.src);
    e.currentTarget.style.display = 'none';
  };

  // Calculate totals
  // Normalize sites and calculate totals
  const sites = evacuationSites ?? [];

  const calculateTotals = () => {
    return sites.reduce((acc, site) => ({
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
      lactating: acc.lactating + (site.lactating || 0)
    }), {
      families: 0, male: 0, female: 0, total: 0, infant: 0, children: 0,
      youth: 0, adult: 0, seniorCitizens: 0, pwd: 0, pregnant: 0, lactating: 0
    });
  };

  try {
    // Generate empty rows if no data provided (for template purposes)
    const displayRows = sites.length > 0 
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
          lactating: 0
        }));

    const totals = calculateTotals();

    return (
      <div className="report-template landscape bg-white p-2">
        {/* Header with Logos */}
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
            <div className="text-sm font-bold mt-4">EVACUATION DATA FOR {disasterEvent}</div>
            <div className="text-xs">as of {reportDate}, {reportTime}</div>
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
              <th className="w-20 border border-black p-1">Total No. of<br/>Male</th>
              <th className="w-20 border border-black p-1">Total No. of<br/>Female</th>
              <th className="w-20 border border-black p-1">Total No. of<br/>Individuals</th>
              <th className="w-20 border border-black p-1">Infant<br/>(1 year old)</th>
              <th className="w-20 border border-black p-1">Children<br/>(2-12 yrs. old)</th>
              <th className="w-20 border border-black p-1">Youth<br/>(13-17 yrs. old)</th>
              <th className="w-20 border border-black p-1">Adult<br/>(18-59 yrs. old)</th>
              <th className="w-20 border border-black p-1">Senior<br/>Citizens<br/>(60 yrs. old and<br/>above)</th>
              <th className="w-16 border border-black p-1">PWD</th>
              <th className="w-20 border border-black p-1">Pregnant<br/>Woman</th>
              <th className="w-20 border border-black p-1">Lactating<br/>Women</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((site, index) => (
              <tr key={index}>
                <td className="h-6 border border-black p-1">{site.barangay}</td>
                <td className="h-6 border border-black p-1">{site.evacuationCenter}</td>
                <td className="h-6 border border-black p-1 text-center">
                  {site.families || ''}
                </td>
                <td className="h-6 border border-black p-1 text-center">
                  {site.male || ''}
                </td>
                <td className="h-6 border border-black p-1 text-center">
                  {site.female || ''}
                </td>
                <td className="h-6 border border-black p-1 text-center">
                  {site.total || ''}
                </td>
                <td className="h-6 border border-black p-1 text-center">
                  {site.infant || ''}
                </td>
                <td className="h-6 border border-black p-1 text-center">
                  {site.children || ''}
                </td>
                <td className="h-6 border border-black p-1 text-center">
                  {site.youth || ''}
                </td>
                <td className="h-6 border border-black p-1 text-center">
                  {site.adult || ''}
                </td>
                <td className="h-6 border border-black p-1 text-center">
                  {site.seniorCitizens || ''}
                </td>
                <td className="h-6 border border-black p-1 text-center">
                  {site.pwd || ''}
                </td>
                <td className="h-6 border border-black p-1 text-center">
                  {site.pregnant || ''}
                </td>
                <td className="h-6 border border-black p-1 text-center">
                  {site.lactating || ''}
                </td>
              </tr>
            ))}
            
            {showTotals && totals && (
              <tr className="font-bold bg-gray-200">
                <td className="border border-black p-1" colSpan={2}>TOTAL</td>
                <td className="border border-black p-1 text-center">{totals.families}</td>
                <td className="border border-black p-1 text-center">{totals.male}</td>
                <td className="border border-black p-1 text-center">{totals.female}</td>
                <td className="border border-black p-1 text-center">{totals.total}</td>
                <td className="border border-black p-1 text-center">{totals.infant || ''}</td>
                <td className="border border-black p-1 text-center">{totals.children || ''}</td>
                <td className="border border-black p-1 text-center">{totals.youth || ''}</td>
                <td className="border border-black p-1 text-center">{totals.adult || ''}</td>
                <td className="border border-black p-1 text-center">{totals.seniorCitizens || ''}</td>
                <td className="border border-black p-1 text-center">{totals.pwd || ''}</td>
                <td className="border border-black p-1 text-center">{totals.pregnant || ''}</td>
                <td className="border border-black p-1 text-center">{totals.lactating || ''}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  } catch (error) {
    console.error('Error rendering DisaggregatedReportTemplate:', error);
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <h2 className="text-red-800 font-bold">Error Loading Report</h2>
        <p className="text-red-600">Failed to render the disaggregated report template.</p>
      </div>
    );
  }
}