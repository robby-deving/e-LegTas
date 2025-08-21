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

// Sample data for demonstration
const sampleEvacuationCenters: EvacuationCenter[] = [
  {
    name: "Pinaric Elementary School",
    evacuees: [
      {
        familyHead: "Ian Gabriel Villame",
        purok: "P-2",
        male: 2,
        female: 1,
        total: 3,
        infant: 0,
        children: 1,
        youth: 0,
        adult: 2,
        seniorCitizens: 0,
        pwd: 0,
        pregnant: 0,
        lactating: 1
      },
      {
        familyHead: "Vicente Bercasio",
        purok: "P-3",
        male: 1,
        female: 2,
        total: 3,
        infant: 1,
        children: 0,
        youth: 1,
        adult: 1,
        seniorCitizens: 0,
        pwd: 0,
        pregnant: 1,
        lactating: 0
      },
      {
        familyHead: "Shakira Regalado",
        purok: "P-1",
        male: 3,
        female: 3,
        total: 6,
        infant: 0,
        children: 2,
        youth: 1,
        adult: 2,
        seniorCitizens: 1,
        pwd: 0,
        pregnant: 0,
        lactating: 0
      },
      {
        familyHead: "Archie Onoya",
        purok: "P-2",
        male: 3,
        female: 1,
        total: 4,
        infant: 0,
        children: 1,
        youth: 1,
        adult: 2,
        seniorCitizens: 0,
        pwd: 1,
        pregnant: 0,
        lactating: 0
      },
      {
        familyHead: "John Robert Rodejo",
        purok: "P-4",
        male: 5,
        female: 5,
        total: 10,
        infant: 1,
        children: 3,
        youth: 2,
        adult: 3,
        seniorCitizens: 1,
        pwd: 0,
        pregnant: 1,
        lactating: 1
      }
    ]
  },
  {
    name: "Barangay Hall Multi-Purpose Center",
    evacuees: [
      {
        familyHead: "Maria Santos Cruz",
        purok: "P-1",
        male: 2,
        female: 3,
        total: 5,
        infant: 1,
        children: 1,
        youth: 1,
        adult: 2,
        seniorCitizens: 0,
        pwd: 0,
        pregnant: 1,
        lactating: 1
      },
      {
        familyHead: "Roberto Dela Rosa",
        purok: "P-3",
        male: 4,
        female: 2,
        total: 6,
        infant: 0,
        children: 2,
        youth: 1,
        adult: 2,
        seniorCitizens: 1,
        pwd: 0,
        pregnant: 0,
        lactating: 0
      },
      {
        familyHead: "Carmen Villanueva",
        purok: "P-2",
        male: 1,
        female: 2,
        total: 3,
        infant: 0,
        children: 0,
        youth: 0,
        adult: 2,
        seniorCitizens: 1,
        pwd: 1,
        pregnant: 0,
        lactating: 0
      }
    ]
  }
];

export default function BarangayReportTemplate({
  barangayName = "Barangay 9 - Pinaric",
  disasterEvent = "TROPICAL STORM KRISTINE",
  reportDate = "31 October 2024",
  reportTime = "5 PM",
  evacuationCenters = sampleEvacuationCenters,
  logo1Src = legazpiLogo1,
  logo2Src = legazpiLogo2, 
}: BarangayReportProps) {

  // Error handling for missing data
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.warn('Failed to load image:', e.currentTarget.src);
    e.currentTarget.style.display = 'none';
  };

  // Calculate subtotals for an evacuation center
  const calculateSubtotal = (evacuees: EvacueeData[]) => {
    return evacuees.reduce((acc, evacuee) => ({
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
      lactating: acc.lactating + (evacuee.lactating || 0)
    }), {
      families: 0, male: 0, female: 0, total: 0, infant: 0, children: 0,
      youth: 0, adult: 0, seniorCitizens: 0, pwd: 0, pregnant: 0, lactating: 0
    });
  };

  // Calculate grand total
  const calculateGrandTotal = () => {
    return evacuationCenters.reduce((grandTotal, center) => {
      const centerTotal = calculateSubtotal(center.evacuees);
      return {
        families: grandTotal.families + centerTotal.families,
        male: grandTotal.male + centerTotal.male,
        female: grandTotal.female + centerTotal.female,
        total: grandTotal.total + centerTotal.total,
        infant: grandTotal.infant + centerTotal.infant,
        children: grandTotal.children + centerTotal.children,
        youth: grandTotal.youth + centerTotal.youth,
        adult: grandTotal.adult + centerTotal.adult,
        seniorCitizens: grandTotal.seniorCitizens + centerTotal.seniorCitizens,
        pwd: grandTotal.pwd + centerTotal.pwd,
        pregnant: grandTotal.pregnant + centerTotal.pregnant,
        lactating: grandTotal.lactating + centerTotal.lactating
      };
    }, {
      families: 0, male: 0, female: 0, total: 0, infant: 0, children: 0,
      youth: 0, adult: 0, seniorCitizens: 0, pwd: 0, pregnant: 0, lactating: 0
    });
  };

  try {
    const grandTotal = calculateGrandTotal();

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
            <div className="text-sm underline font-bold p-2">{barangayName}</div>
            <div className="text-sm font-bold mt-1">EVACUATION DATA FOR {disasterEvent}</div>
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
              <th className="w-50 border border-black p-1">Evacuation Center/Site</th>
              <th className="w-32 border border-black p-1">Family Head</th>
              <th className="w-20 border border-black p-1">Purok</th>
              <th className="w-20 border border-black p-1">Total No. of<br/>Male</th>
              <th className="w-20 border border-black p-1">Total No. of<br/>Female</th>
              <th className="w-20 border border-black p-1">Total No. of<br/>Individuals</th>
              <th className="w-20 border border-black p-1">Infant<br/>(1 year old)</th>
              <th className="w-20 border border-black p-1">Children<br/>(2-12 yrs. old)</th>
              <th className="w-20 border border-black p-1">Youth<br/>(13-17 yrs. old)</th>
              <th className="w-20 border border-black p-1">Adult<br/>(18-59 yrs. old)</th>
              <th className="w-20 border border-black p-1">Senior Citizens<br/>(60+ yrs. old)</th>
              <th className="w-16 border border-black p-1">PWD</th>
              <th className="w-20 border border-black p-1">Pregnant<br/>Woman</th>
              <th className="w-20 border border-black p-1">Lactating<br/>Women</th>
            </tr>
          </thead>
          <tbody>
            {evacuationCenters.length === 0 ? (
              // Show empty template if no data
              <tr>
                <td className="border border-black p-1" colSpan={14}>
                  No evacuation data available
                </td>
              </tr>
            ) : (
              evacuationCenters.map((center, centerIndex) => {
                const subtotal = calculateSubtotal(center.evacuees);
                return (
                  <React.Fragment key={centerIndex}>
                    {/* Evacuation Center Rows */}
                    {center.evacuees.map((evacuee, evacueeIndex) => (
                      <tr key={`${centerIndex}-${evacueeIndex}`}>
                        {evacueeIndex === 0 && (
                          <td 
                            rowSpan={center.evacuees.length + 1} 
                            className="align-top font-bold border border-black p-1"
                          >
                            {center.name}
                          </td>
                        )}
                        <td className="border border-black p-1">{evacuee.familyHead}</td>
                        <td className="border border-black p-1 text-center">{evacuee.purok}</td>
                        <td className="border border-black p-1 text-center">{evacuee.male || ''}</td>
                        <td className="border border-black p-1 text-center">{evacuee.female || ''}</td>
                        <td className="border border-black p-1 text-center">{evacuee.total || ''}</td>
                        <td className="border border-black p-1 text-center">{evacuee.infant || ''}</td>
                        <td className="border border-black p-1 text-center">{evacuee.children || ''}</td>
                        <td className="border border-black p-1 text-center">{evacuee.youth || ''}</td>
                        <td className="border border-black p-1 text-center">{evacuee.adult || ''}</td>
                        <td className="border border-black p-1 text-center">{evacuee.seniorCitizens || ''}</td>
                        <td className="border border-black p-1 text-center">{evacuee.pwd || ''}</td>
                        <td className="border border-black p-1 text-center">{evacuee.pregnant || ''}</td>
                        <td className="border border-black p-1 text-center">{evacuee.lactating || ''}</td>
                      </tr>
                    ))}
                    
                    {/* Subtotal Row */}
                    <tr className="font-bold bg-gray-100">
                      <td className="border border-black p-1 text-center">{subtotal.families}</td>
                      <td className="border border-black p-1"></td>
                      <td className="border border-black p-1 text-center">{subtotal.male}</td>
                      <td className="border border-black p-1 text-center">{subtotal.female}</td>
                      <td className="border border-black p-1 text-center">{subtotal.total}</td>
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
            {evacuationCenters.length > 0 && (
              <tr className="font-bold bg-gray-200">
                <td className="border border-black p-1">Total</td>
                <td className="border border-black p-1 text-center">{grandTotal.families}</td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1 text-center">{grandTotal.male}</td>
                <td className="border border-black p-1 text-center">{grandTotal.female}</td>
                <td className="border border-black p-1 text-center">{grandTotal.total}</td>
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
  } catch (error) {
    console.error('Error rendering BarangayReportTemplate:', error);
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <h2 className="text-red-800 font-bold">Error Loading Report</h2>
        <p className="text-red-600">Failed to render the barangay report template.</p>
      </div>
    );
  }
}