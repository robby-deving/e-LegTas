import React from 'react';
import legazpiLogo1 from '../../assets/legazpi-logo1.png';
import legazpiLogo2 from '../../assets/legazpi-logo2.jpg';

interface AggregatedReportProps {
  disasterEvent?: string;
  reportDate?: string;
  reportTime?: string;
  evacuationCenters?: Array<{
    name: string;
    address: string;
    originBarangay: string;
    insideFamilies: number;
    insidePersons: number;
    outsideFamilies: number;
    outsidePersons: number;
  }>;
  logo1Src?: string;
  logo2Src?: string;
}

// Sample data for demonstration
const sampleEvacuationCenters: AggregatedReportProps['evacuationCenters'] = [
  {
    name: "Legazpi Elementary School",
    address: "Rizal Street, Legazpi City",
    originBarangay: "Barangay 9 - Pinaric",
    insideFamilies: 15,
    insidePersons: 52,
    outsideFamilies: 8,
    outsidePersons: 28
  },
  {
    name: "Barangay Hall - Pinaric",
    address: "Pinaric Road, Legazpi City",
    originBarangay: "Barangay 9 - Pinaric",
    insideFamilies: 12,
    insidePersons: 45,
    outsideFamilies: 5,
    outsidePersons: 18
  },
  {
    name: "Legazpi Sports Complex",
    address: "Maharlika Highway, Legazpi City",
    originBarangay: "Barangay 12 - Cabangan",
    insideFamilies: 25,
    insidePersons: 89,
    outsideFamilies: 10,
    outsidePersons: 35
  },
  {
    name: "Sacred Heart Church",
    address: "Peñaranda Street, Legazpi City",
    originBarangay: "Barangay 3 - Centro",
    insideFamilies: 8,
    insidePersons: 30,
    outsideFamilies: 3,
    outsidePersons: 12
  },
  {
    name: "Aquinas University Gymnasium",
    address: "Rawis, Legazpi City",
    originBarangay: "Barangay 15 - Rawis",
    insideFamilies: 18,
    insidePersons: 64,
    outsideFamilies: 7,
    outsidePersons: 24
  }
];

export default function AggregatedReportTemplate({
  disasterEvent = "TROPICAL STORM KRISTINE",
  reportDate = "31 October 2024",
  reportTime = "5 PM",
  evacuationCenters = sampleEvacuationCenters,
  logo1Src = legazpiLogo1,
  logo2Src = legazpiLogo2
}: AggregatedReportProps) {
  
  // Error handling for missing data
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.warn('Failed to load image:', e.currentTarget.src);
    e.currentTarget.style.display = 'none';
  };

  try {
    // Normalize evacuationCenters to an array and generate empty rows if no data provided
    const centers = evacuationCenters ?? [];
    const displayRows = centers.length > 0
      ? centers
      : Array.from({ length: 20 }, () => ({
          name: '',
          address: '',
          originBarangay: '',
          insideFamilies: 0,
          insidePersons: 0,
          outsideFamilies: 0,
          outsidePersons: 0
        }));

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
            <div className="text-sm font-bold mt-4">STATUS REPORT FOR {disasterEvent}</div>
            <div className="text-xs">as of {reportDate}, {reportTime}</div>
          </div>
          
          <div className="w-20 h-20">
            {logo2Src && (
              <img 
                src={logo2Src} 
                alt="City of Legazpi Logo" 
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            )}
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
                Origin of IDP's<br/>Barangay Name
              </th>
              <th colSpan={4} className="text-center border border-black p-1 text-xs">
                Number of Displaced
              </th>
            </tr>
            <tr>
              <th colSpan={2} className="text-center border border-black p-1 text-xs">
                Inside EC'S
              </th>
              <th colSpan={2} className="text-center border border-black p-1 text-xs">
                Outside EC'S
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
            {displayRows.map((center, index) => (
              <tr key={index}>
                <td className="border border-black p-1 text-xs">{center.name}</td>
                <td className="border border-black p-1 text-xs">{center.address}</td>
                <td className="border border-black p-1 text-xs">{center.originBarangay}</td>
                <td className="border border-black p-1 text-xs text-center">
                  {center.insideFamilies || ''}
                </td>
                <td className="border border-black p-1 text-xs text-center">
                  {center.insidePersons || ''}
                </td>
                <td className="border border-black p-1 text-xs text-center">
                  {center.outsideFamilies || ''}
                </td>
                <td className="border border-black p-1 text-xs text-center">
                  {center.outsidePersons || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } catch (error) {
    console.error('Error rendering AggregatedReportTemplate:', error);
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <h2 className="text-red-800 font-bold">Error Loading Report</h2>
        <p className="text-red-600">Failed to render the aggregated report template.</p>
      </div>
    );
  }
}