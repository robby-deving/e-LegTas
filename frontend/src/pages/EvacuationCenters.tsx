import { useState, useEffect } from 'react';
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/table";
import { Pagination } from "../components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Trash2, Edit, X } from "lucide-react";
import { usePageTitle } from '../hooks/usePageTitle';

type EvacuationCenter = {
  id: number;
  name: string;
  address: string;
  barangay_id: number;
  latitude: number;
  longitude: number;
  ec_status: 'Available' | 'Full' | 'Maintenance' | 'Unavailable';
  category: 'School' | 'Gymnasium' | 'Covered Court' | 'Barangay Hall' | 'Community Center' | 'Chapel/Church' | 'Dedicated Evacuation Center' | 'Government Building' | 'Commercial Building';
  camp_manager_id: number | null;
  total_individual: number;
  created_by: number;
  rooms?: EvacuationRoom[];
};

type EvacuationRoom = {
  id: string;
  roomName: string;
  type: string;
  capacity: number;
};

const EVACUATION_CENTERS: EvacuationCenter[] = [
  {id:1,name:'Albay Cathedral and Pastoral Center',address:'Cabugao, Legazpi',barangay_id:0,latitude:13.138458,longitude:123.749919,ec_status:'Available',category:'Chapel/Church',camp_manager_id:null,total_individual:0,created_by:1},
  {id:2,name:'Albay Central School',address:'East Washington, Legazpi City',barangay_id:0,latitude:13.140539,longitude:123.736178,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:3,name:'AMEC BCCM',address:'Pinaric, Legazpi City',barangay_id:0,latitude:13.139683,longitude:123.730881,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:4,name:'Arimbay Chapel',address:'Arimbay, Legazpi City',barangay_id:0,latitude:13.186153,longitude:123.753439,ec_status:'Available',category:'Chapel/Church',camp_manager_id:null,total_individual:0,created_by:1},
  {id:5,name:'Arimbay Elementary School',address:'Arimbay, Legazpi City',barangay_id:0,latitude:13.186917,longitude:123.752839,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:6,name:'Bagacay Elementary School',address:'Bagacay, Legazpi City',barangay_id:0,latitude:13.07085,longitude:123.760806,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:7,name:'Bagong Abre Elementary School',address:'Bagong Abre, Legazpi City',barangay_id:0,latitude:13.188206,longitude:123.739289,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:8,name:'Bagumbayan Central School',address:'Bagumbayan, Legazpi City',barangay_id:0,latitude:13.141458,longitude:123.735175,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:9,name:'Bagumbayan Evacuation Center',address:'Bagumbayan, Legazpi City',barangay_id:0,latitude:13.141458,longitude:123.735175,ec_status:'Available',category:'Dedicated Evacuation Center',camp_manager_id:null,total_individual:0,created_by:1},
  {id:10,name:'Banquerohan Elementary School',address:'Banquerohan, Legazpi City',barangay_id:0,latitude:13.056011,longitude:123.747728,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:11,name:'Banquerohan Nation HighSchool',address:'Banquerohan, Legazpi City',barangay_id:0,latitude:13.054908,longitude:123.749469,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:12,name:'Bariis Elementary School',address:'Bariis, Legazpi City',barangay_id:0,latitude:13.022961,longitude:123.744572,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:13,name:'BFP Building',address:'Dapdap, Legazpi City',barangay_id:0,latitude:13.141311,longitude:123.759775,ec_status:'Available',category:'Government Building',camp_manager_id:null,total_individual:0,created_by:1},
  {id:14,name:'Bicol University',address:"EM's Barrio South, Legazpi City",barangay_id:0,latitude:13.144342,longitude:123.723133,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:15,name:'Bigaa Elementary School',address:'Bigaa, Legazpi City',barangay_id:0,latitude:13.193958,longitude:123.754136,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:16,name:'Bigaa Pastoral Center',address:'Bigaa, Legazpi City',barangay_id:0,latitude:13.194156,longitude:123.755126,ec_status:'Available',category:'Chapel/Church',camp_manager_id:null,total_individual:0,created_by:1},
  {id:17,name:'Bitano Elementary School',address:'Bitano, Legazpi City',barangay_id:0,latitude:13.139061,longitude:123.7438,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:18,name:'Bogña Elementary School',address:'Bogña, Legazpi City',barangay_id:0,latitude:13.187872,longitude:123.727533,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:19,name:'Bogtong Elementary School',address:'Bogtong, Legazpi City',barangay_id:0,latitude:13.160786,longitude:123.733139,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:20,name:'Buenavista Elementary School',address:'Buenavista, Legazpi City',barangay_id:0,latitude:13.048811,longitude:123.804925,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:21,name:'Buraguis Elementary School',address:'Buraguis, Legazpi City',barangay_id:0,latitude:13.135944,longitude:123.753536,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:22,name:'Buraguis Evacuation Center',address:'Buraguis, Legazpi City',barangay_id:0,latitude:13.135944,longitude:123.753536,ec_status:'Available',category:'Dedicated Evacuation Center',camp_manager_id:null,total_individual:0,created_by:1},
  {id:23,name:'Buyoan Elementary School',address:'Buyoan, Legazpi City',barangay_id:0,latitude:13.203472,longitude:123.742608,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:24,name:'Cabagñan Elementary School',address:'Cabagñan East, Legazpi City',barangay_id:0,latitude:13.141694,longitude:123.749031,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:25,name:'Cabagñan High School',address:'Cabagñan East, Legazpi City',barangay_id:0,latitude:13.1418,longitude:123.748986,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:26,name:'Cagbacong Elementary School',address:'Cagbacong, Legazpi City',barangay_id:0,latitude:0,longitude:0,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:27,name:'Dapdap Elementary School',address:'Dapdap, Legazpi City',barangay_id:0,latitude:13.140806,longitude:123.759047,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:28,name:'Dita Elementary School',address:'Dita, Legazpi City',barangay_id:0,latitude:13.178792,longitude:123.739847,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:29,name:'Divine Word High School Gymnasium',address:'Cruzada, Legazpi',barangay_id:0,latitude:13.148628,longitude:123.736881,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:30,name:'Don Bosco Agro-Mechanical Technology Center',address:'Banquerohan, Legazpi City',barangay_id:0,latitude:13.042725,longitude:123.760247,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:31,name:'DZGB Radio Station',address:'Imperial Court, Legazpi City',barangay_id:0,latitude:13.140897,longitude:123.752581,ec_status:'Available',category:'Commercial Building',camp_manager_id:null,total_individual:0,created_by:1},
  {id:32,name:"EM's Barrio Elementary School",address:"EM's Barrio, Legazpi City",barangay_id:0,latitude:13.146278,longitude:123.730214,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:33,name:'Estanza Elementary School',address:'Estanza, Legazpi City',barangay_id:0,latitude:13.122628,longitude:123.729158,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:34,name:'Genecom',address:'Rawis, Legazpi City',barangay_id:0,latitude:13.171347,longitude:123.751489,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:35,name:'Gogon Central School',address:'Gogon, Legazpi City',barangay_id:0,latitude:13.155822,longitude:123.745328,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:36,name:'Gogon Evacuation Center',address:'Gogon, Legazpi City',barangay_id:0,latitude:13.154786,longitude:123.745778,ec_status:'Available',category:'Dedicated Evacuation Center',camp_manager_id:null,total_individual:0,created_by:1},
  {id:37,name:'Gogon JICA building',address:'Gogon, Legazpi City',barangay_id:0,latitude:13.154786,longitude:123.745778,ec_status:'Available',category:'Dedicated Evacuation Center',camp_manager_id:null,total_individual:0,created_by:1},
  {id:38,name:'Gogon High School',address:'Gogon, Legazpi City',barangay_id:0,latitude:13.154786,longitude:123.745778,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:39,name:'Homapon Elementary School',address:'Homapon, Legazpi City',barangay_id:0,latitude:13.090961,longitude:123.739369,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:40,name:'Homapon Highschool',address:'Homapon, Legazpi City',barangay_id:0,latitude:13.094278,longitude:123.740072,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:41,name:'Ibalon Central School',address:'Oro-Site, Legazpi City',barangay_id:0,latitude:13.148372,longitude:123.753058,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:42,name:'Imalnod Elementary School',address:'Imalnod, Legazpi City',barangay_id:0,latitude:13.063666,longitude:123.724091,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:43,name:'Lamba Elementary School',address:'Lamba, Legazpi City',barangay_id:0,latitude:13.121661,longitude:123.779208,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:44,name:'Legazpi City PAGCOR Multi-purpose Evacuation Center (2 flrs)',address:'Homapon, Legazpi City',barangay_id:0,latitude:13.091827,longitude:123.738875,ec_status:'Available',category:'Dedicated Evacuation Center',camp_manager_id:null,total_individual:0,created_by:1},
  {id:45,name:'Legazpi City Evacuation Center',address:'Homapon, Legazpi City',barangay_id:0,latitude:13.091758,longitude:123.7391,ec_status:'Available',category:'Dedicated Evacuation Center',camp_manager_id:null,total_individual:0,created_by:1},
  {id:46,name:'Legazpi City Science High School',address:'Bitano, Legazpi City',barangay_id:0,latitude:13.154786,longitude:123.745778,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:47,name:'Legazpi Port Elementary School',address:'Centro Baybay, Legazpi City',barangay_id:0,latitude:13.148558,longitude:123.754017,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:48,name:'Mabinit Elementary School',address:'Mabinit, Legazpi City',barangay_id:0,latitude:13.184242,longitude:123.717169,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:49,name:'Mariawa Elementary School',address:'Mariawa, Legazpi City',barangay_id:0,latitude:13.103689,longitude:123.723831,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:50,name:'Maoyod Social Hall',address:'Maoyod, Legazpi City',barangay_id:0,latitude:13.135186,longitude:123.731968,ec_status:'Available',category:'Government Building',camp_manager_id:null,total_individual:0,created_by:1},
  {id:51,name:'Maslog Elementary School',address:'Maslog, Legazpi City',barangay_id:0,latitude:13.101881,longitude:123.770889,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:52,name:'Maslog High School',address:'Maslog, Legazpi City',barangay_id:0,latitude:0,longitude:0,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:53,name:'Matanag Elementary School',address:'Matanag, Legazpi City',barangay_id:0,latitude:13.196292,longitude:123.734222,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:54,name:'Meriam College of Technology, Inc.',address:'Sabang, Legazpi City',barangay_id:0,latitude:13.14615,longitude:123.756,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:55,name:'NFA Building',address:'Dinagaan, Legazpi City',barangay_id:0,latitude:13.146333,longitude:123.755408,ec_status:'Available',category:'Government Building',camp_manager_id:null,total_individual:0,created_by:1},
  {id:56,name:'Oro Site HighSchool',address:'Oro-Site, Legazpi City',barangay_id:0,latitude:13.150869,longitude:123.750953,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:57,name:'Padang Elementary School',address:'Padang, Legazpi City',barangay_id:0,latitude:13.208333,longitude:123.756072,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:58,name:'Pag asa Natl High School',address:'Rawis, Legazpi City',barangay_id:0,latitude:13.188967,longitude:123.746956,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:59,name:'Pawa Elementary School',address:'Pawa, Legazpi City',barangay_id:0,latitude:13.177,longitude:123.730194,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:60,name:'Pawa High School',address:'Pawa, Legazpi City',barangay_id:0,latitude:13.177017,longitude:123.730106,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:61,name:'Phil. Coast Guard',address:'Rawis, Legazpi City',barangay_id:0,latitude:13.135536,longitude:123.760728,ec_status:'Available',category:'Government Building',camp_manager_id:null,total_individual:0,created_by:1},
  {id:62,name:'Population Commission',address:'Buraguis, Legazpi City',barangay_id:0,latitude:13.136264,longitude:123.752767,ec_status:'Available',category:'Government Building',camp_manager_id:null,total_individual:0,created_by:1},
  {id:63,name:'Puro Elementary School',address:'Puro, Legazpi City',barangay_id:0,latitude:13.135456,longitude:123.76095,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:64,name:'Rawis Elementary School',address:'Rawis, Legazpi City',barangay_id:0,latitude:13.172283,longitude:123.751411,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:65,name:'Reyes Computer Oriented School',address:'Binanuahan West, Legazpi City',barangay_id:0,latitude:13.140506,longitude:123.750828,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:66,name:'San Francisco Elementary School',address:'San Francisco, Legazpi City',barangay_id:0,latitude:13.037161,longitude:123.783383,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:67,name:'San Joaquin Elementary School',address:'San Joaquin, Legazpi City',barangay_id:0,latitude:13.180833,longitude:123.742028,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:68,name:'San Roque Elementary School',address:'San Roque, Legazpi City',barangay_id:0,latitude:13.152911,longitude:123.75484,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:69,name:'SLTFI',address:'San Roque, Legazpi City',barangay_id:0,latitude:13.149878,longitude:123.753483,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:70,name:'St. Raphael Pastoral Center',address:'Centro Baybay, Legazpi City',barangay_id:0,latitude:13.149183,longitude:123.753592,ec_status:'Available',category:'Chapel/Church',camp_manager_id:null,total_individual:0,created_by:1},
  {id:71,name:'St. Raphael Academy',address:'Centro Baybay, Legazpi City',barangay_id:0,latitude:13.149158,longitude:123.754425,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:72,name:'Tamaoyan Elementary School',address:'Tamaoyan, Legazpi City',barangay_id:0,latitude:13.173325,longitude:123.740989,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:73,name:'Taysan Elementary School',address:'Taysan, Legazpi City',barangay_id:0,latitude:13.116367,longitude:123.744247,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:74,name:'Taysan Resettlement Integrated School',address:'Taysan, Legazpi City',barangay_id:0,latitude:13.123828,longitude:123.744794,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:75,name:'UST Legazpi Dome',address:'Rawis, Legazpi City',barangay_id:0,latitude:13.163142,longitude:123.749575,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:76,name:'Victory Village Elementary School',address:'Victory Village, Legazpi City',barangay_id:0,latitude:13.144417,longitude:123.756094,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:77,name:'Washington International School',address:'Bagumbayan, Legazpi City',barangay_id:0,latitude:13.147558,longitude:123.733992,ec_status:'Available',category:'School',camp_manager_id:null,total_individual:0,created_by:1},
  {id:78,name:'Wesleyan Church',address:'Old Albay, Legazpi City',barangay_id:0,latitude:13.139167,longitude:123.728758,ec_status:'Available',category:'Chapel/Church',camp_manager_id:null,total_individual:0,created_by:1}];

const STATUS_COLORS = {
  'Available': 'text-green-600 bg-green-100',
  'Full': 'text-red-600 bg-red-100',
  'Maintenance': 'text-yellow-600 bg-yellow-100',
  'Unavailable': 'text-gray-600 bg-gray-100'
};

const CATEGORIES = [
  'School',
  'Gymnasium', 
  'Covered Court',
  'Barangay Hall',
  'Community Center',
  'Chapel/Church',
  'Dedicated Evacuation Center',
  'Government Building',
  'Commercial Building'
];

const ROOM_TYPES = [
  'Classroom',
  'Gymnasium',
  'Auditorium',
  'Conference Room',
  'Multipurpose Room',
  'Dormitory',
  'Medical Room',
  'Storage Room'
];

export default function EvacuationCenters() {
  usePageTitle('Evacuation Centers');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCenters, setFilteredCenters] = useState<EvacuationCenter[]>(EVACUATION_CENTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedCenters] = useState<string[]>([]);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingCenter, setEditingCenter] = useState<EvacuationCenter | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    streetName: '',
    barangay: '',
    latitude: '',
    longitude: '',
    capacity: ''
  });
  
  const [rooms, setRooms] = useState<EvacuationRoom[]>([]);

  // Filter evacuation centers based on search term
  useEffect(() => {
    const filtered = EVACUATION_CENTERS.filter(center =>
      center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCenters(filtered);
    setCurrentPage(1);
  }, [searchTerm]);

  // Handle rows per page change
  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1);
  };

  // Pagination logic
  const totalRows = filteredCenters.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = filteredCenters.slice(startIndex, endIndex);

  // Modal handlers
  const handleAddCenter = () => {
    setModalMode('add');
    setFormData({
      name: '',
      category: '',
      streetName: '',
      barangay: '',
      latitude: '',
      longitude: '',
      capacity: ''
    });
    setRooms([]);
    setIsModalOpen(true);
  };

  const handleEditCenter = (center: EvacuationCenter) => {
    setModalMode('edit');
    setEditingCenter(center);
    setFormData({
      name: center.name,
      category: center.category,
      streetName: center.address.split(',')[0] || '',
      barangay: center.address.split(',')[1]?.trim() || '',
      latitude: center.latitude.toString(),
      longitude: center.longitude.toString(),
      capacity: center.total_individual.toString()
    });
    setRooms(center.rooms || []);
    setIsModalOpen(true);
  };

  const handleDeleteCenter = (center: EvacuationCenter) => {
    if (confirm(`Are you sure you want to delete "${center.name}"?`)) {
      // Handle deletion logic here
      console.log('Deleting center:', center.id);
    }
  };

  const handleFormInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Room handlers
  const handleAddRoom = () => {
    const newRoom: EvacuationRoom = {
      id: Date.now().toString(),
      roomName: '',
      type: '',
      capacity: 0
    };
    setRooms(prev => [newRoom, ...prev]);
  };

  const handleRoomChange = (roomId: string, field: string, value: string | number) => {
    setRooms(prev => prev.map(room => 
      room.id === roomId 
        ? { ...room, [field]: value }
        : room
    ));
  };

  const handleDeleteRoom = (roomId: string) => {
    setRooms(prev => prev.filter(room => room.id !== roomId));
  };

  const handleSaveCenter = () => {
    // Handle save logic here
    console.log('Saving center:', formData, rooms);
    setIsModalOpen(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCenter(null);
  };

  return (
    <div className="text-black p-6 space-y-6 flex flex-col">
      {/* Page Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-green-800">
          Evacuation Centers
        </h1>

        {/* Search and Add Button */}
        <div className="flex items-center justify-between gap-4">
          <Input
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Button 
            onClick={handleAddCenter}
            className="bg-green-700 hover:bg-green-800 text-white px-6 flex gap-2 items-center cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Evacuation Center
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-input overflow-hidden">
        <div className="relative w-full overflow-x-auto">
          {currentRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="text-gray-500 text-lg font-medium mb-2">
                No evacuation centers found
              </div>
              <p className="text-gray-400 text-sm">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="text-left">
                    Evacuation Center
                  </TableHead>
                  <TableHead className="text-left">
                    Address
                  </TableHead>
                  <TableHead className="text-left">
                    Category
                  </TableHead>
                  <TableHead className="text-left">
                    Total Individual
                  </TableHead>
                  <TableHead className="text-left">
                    Longitude
                  </TableHead>
                  <TableHead className="text-left">
                    Latitude
                  </TableHead>
                  <TableHead className="text-left">
                    Status
                  </TableHead>
                  <TableHead className="text-center w-12">
                    ⋯
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRows.map((center) => (
                  <TableRow key={center.id} className="hover:bg-gray-50 px-1">
                    <TableCell className="text-foreground font-medium">
                      {center.name}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {center.address}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {center.category}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {center.total_individual}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {center.longitude.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {center.latitude.toFixed(4)}
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[center.ec_status]}`}>
                        {center.ec_status}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-4 w-4 p-0 cursor-pointer">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleEditCenter(center)}
                            className="cursor-pointer"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteCenter(center)}
                            className="cursor-pointer text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex-1 text-sm text-muted-foreground">
          {selectedCenters.length > 0 && (
            <span className="mr-4">
              {selectedCenters.length} of {totalRows} row(s) selected.
            </span>
          )}
          {currentRows.length} of {totalRows} row(s) shown.
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          rowsPerPage={rowsPerPage}
          totalRows={totalRows}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      </div>

      {/* Add/Edit Evacuation Center Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent size="xl" className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-green-700 text-xl font-bold">
              {modalMode === 'add' ? 'Add Evacuation Center' : 'Edit Evacuation Center'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 py-2">
            {/* Left Column - Basic Information */}
            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name:</label>
                <Input
                  placeholder="Disaster Name"
                  value={formData.name}
                  onChange={(e) => handleFormInputChange('name', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category:</label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => handleFormInputChange('category', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Street Name:</label>
                <Input
                  placeholder="Street Name"
                  value={formData.streetName}
                  onChange={(e) => handleFormInputChange('streetName', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Barangay:</label>
                <Input
                  placeholder="Address"
                  value={formData.barangay}
                  onChange={(e) => handleFormInputChange('barangay', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Latitude:</label>
                  <Input
                    placeholder="0.00000"
                    value={formData.latitude}
                    onChange={(e) => handleFormInputChange('latitude', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Longitude:</label>
                  <Input
                    placeholder="0.00000"
                    value={formData.longitude}
                    onChange={(e) => handleFormInputChange('longitude', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Capacity:</label>
                <Input
                  placeholder="Capacity"
                  value={formData.capacity}
                  onChange={(e) => handleFormInputChange('capacity', e.target.value)}
                />
              </div>
            </div>

            {/* Right Column - Evacuation Rooms */}
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium self-start">Evacuation Rooms</label>
                <Button
                  type="button"
                  onClick={handleAddRoom}
                  className="bg-green-700 hover:bg-green-800 text-white px-3 text-xs cursor-pointer h-7"
                >
                  + Add Room
                </Button>
              </div>

              {/* Scrollable room container */}
              <div className="max-h-105 overflow-y-auto space-y-3 pr-2">
                {rooms.length === 0 ? (
                  <div className="text-center text-sm text-gray-500 py-8">
                    No rooms added yet. Click "Add Room" to get started.
                  </div>
                ) : (
                  rooms.map((room) => (
                    <div key={room.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRoom(room.id)}
                          className="text-red-600 hover:text-red-800 h-3 w-3 cursor-pointer"
                        >
                          <X className="w-4 h-4 text-black" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Room Name</label>
                          <Input
                            placeholder="Room Name"
                            value={room.roomName}
                            onChange={(e) => handleRoomChange(room.id, 'roomName', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Type</label>
                          <Select 
                            value={room.type} 
                            onValueChange={(value) => handleRoomChange(room.id, 'type', value)}
                          >
                            <SelectTrigger className="text-sm w-full">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              {ROOM_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Capacity</label>
                          <Input
                            placeholder="0"
                            type="number"
                            value={room.capacity || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              handleRoomChange(room.id, 'capacity', value === '' ? 0 : parseInt(value) || 0);
                            }}
                            className="text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter >
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCenter}
              className="bg-green-700 hover:bg-green-800 text-white"
            >
              {modalMode === 'add' ? 'Add' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}