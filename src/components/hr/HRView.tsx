import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Employee, AttendanceRecord, LeaveApplication, WorkShift, EmploymentType, LeaveType } from '../../types';
import { 
  Users, 
  Clock, 
  Calendar, 
  FileText, 
  Settings, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  UserCheck, 
  Phone, 
  Mail, 
  DollarSign, 
  Briefcase, 
  CalendarDays, 
  Layers, 
  Download, 
  Upload,
  FileSpreadsheet,
  Fingerprint,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Building2,
  Timer,
  Check,
  X,
  ArrowRight,
  Wifi,
  Globe,
  Database,
  Server,
  Radio
} from 'lucide-react';
import { 
  exportAttendanceToExcel, 
  generateAttendanceTemplateExcel, 
  parseAttendanceSpreadsheet, 
  readSpreadsheetFile, 
  ParseAttendanceResult 
} from '../../utils/excelUtils';

export type HRSubTab = 
  | 'employee-manager'
  | 'attendance'
  | 'manual-attendance'
  | 'leave-application'
  | 'settings-employment'
  | 'settings-shift'
  | 'settings-leave';

export const HRView: React.FC<{ initialSubTab?: HRSubTab }> = ({ initialSubTab = 'employee-manager' }) => {
  const { 
    data, 
    addEmployee, 
    editEmployee, 
    deleteEmployee,
    addAttendanceRecord,
    updateAttendanceRecord,
    deleteAttendanceRecord,
    bulkSyncAttendanceRecords,
    addLeaveApplication,
    updateLeaveStatus,
    deleteLeaveApplication,
    addWorkShift,
    editWorkShift,
    deleteWorkShift,
    addEmploymentType,
    editEmploymentType,
    deleteEmploymentType,
    addLeaveType,
    editLeaveType,
    deleteLeaveType,
    activeSubNav,
    language
  } = useRestaurant();

  const [activeTab, setActiveTab] = useState<HRSubTab>((activeSubNav as HRSubTab) || initialSubTab);

  // Sync activeTab if activeSubNav changes
  React.useEffect(() => {
    if (activeSubNav) {
      if (activeSubNav === 'employees' || activeSubNav === 'employee-manager') {
        setActiveTab('employee-manager');
      } else if (activeSubNav === 'leaves' || activeSubNav === 'leave-application') {
        setActiveTab('leave-application');
      } else if ([
        'employee-manager',
        'attendance',
        'manual-attendance',
        'leave-application',
        'settings-employment',
        'settings-shift',
        'settings-leave'
      ].includes(activeSubNav)) {
        setActiveTab(activeSubNav as HRSubTab);
      }
    }
  }, [activeSubNav]);

  const employees = data.employees || [];
  const attendanceRecords = data.attendanceRecords || [];
  const leaveApplications = data.leaveApplications || [];
  const workShifts = data.workShifts || [];
  const employmentTypes = data.employmentTypes || [];
  const leaveTypes = data.leaveTypes || [];

  // Employee Modal State
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [empSearch, setEmpSearch] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('ALL');
  const [empForm, setEmpForm] = useState<Omit<Employee, 'id'>>({
    empCode: '',
    name: '',
    designation: 'Floor Waiter',
    department: 'Floor Service',
    employmentTypeId: employmentTypes[0]?.id || 'emp-ft',
    shiftId: workShifts[0]?.id || 'shift-1',
    cardId: '',
    fingerId: '',
    basicSalary: 18000,
    phone: '+880 1700-000000',
    email: '',
    nid: '',
    address: data.restaurantProfile?.address || 'Chattogram, Bangladesh',
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE'
  });

  // Manual Attendance Modal / Form State
  const [isManualAttModalOpen, setIsManualAttModalOpen] = useState(false);
  const [attForm, setAttForm] = useState({
    employeeId: employees[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    shift: 'Morning Shift',
    inTime: '09:00',
    outTime: '17:00',
    status: 'PRESENT' as AttendanceRecord['status'],
    workingHours: 8,
    overtimeHours: 0,
    notes: 'Regular on-time shift'
  });

  // Leave Application Form State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    employeeId: employees[0]?.id || '',
    leaveTypeId: leaveTypes[0]?.id || 'lt-cl',
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    totalDays: 2,
    reason: 'Personal urgent family matter'
  });

  // Shift Modal State
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftForm, setShiftForm] = useState<Omit<WorkShift, 'id'>>({
    name: '',
    startTime: '09:00',
    endTime: '17:00',
    graceMinutes: 15,
    isDefault: false
  });

  // Employment Type Modal State
  const [isEmpTypeModalOpen, setIsEmpTypeModalOpen] = useState(false);
  const [editingEmpTypeId, setEditingEmpTypeId] = useState<string | null>(null);
  const [empTypeForm, setEmpTypeForm] = useState<Omit<EmploymentType, 'id'>>({
    name: '',
    code: '',
    description: ''
  });

  // Leave Type Modal State
  const [isLeaveTypeModalOpen, setIsLeaveTypeModalOpen] = useState(false);
  const [editingLeaveTypeId, setEditingLeaveTypeId] = useState<string | null>(null);
  const [leaveTypeForm, setLeaveTypeForm] = useState<Omit<LeaveType, 'id'>>({
    name: '',
    code: '',
    daysAllowedPerYear: 12,
    isPaid: true
  });

  // Attendance Date Filter & View Mode
  const [attDateFilter, setAttDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [attViewMode, setAttViewMode] = useState<'ALL_STAFF' | 'PUNCHED_ONLY'>('ALL_STAFF');

  // Biometric / Excel Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<ParseAttendanceResult | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Biometric Device IP Direct Sync States
  const [isIpSyncModalOpen, setIsIpSyncModalOpen] = useState(false);
  const [deviceIp, setDeviceIp] = useState(() => localStorage.getItem('biometric_device_ip') || '192.168.1.201');
  const [devicePort, setDevicePort] = useState(() => localStorage.getItem('biometric_device_port') || '4370');
  const [ipFilterDate, setIpFilterDate] = useState(true);
  const [isTestingIp, setIsTestingIp] = useState(false);
  const [ipTestStatus, setIpTestStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [ipTestMsg, setIpTestMsg] = useState('');
  const [isFetchingFromDevice, setIsFetchingFromDevice] = useState(false);
  const [ipFetchResult, setIpFetchResult] = useState<{
    items: AttendanceRecord[];
    matchedCount: number;
    unmatchedCount: number;
    totalDeviceLogs: number;
    unmatchedIds: string[];
  } | null>(null);
  const [ipSyncSuccessMsg, setIpSyncSuccessMsg] = useState<string | null>(null);

  // Employee CRUD handlers
  const handleOpenAddEmp = () => {
    const nextCode = `EMP-${(employees.length + 1).toString().padStart(2, '0')}`;
    setEmpForm({
      empCode: nextCode,
      name: '',
      designation: 'Floor Waiter',
      department: 'Floor Service',
      employmentTypeId: employmentTypes[0]?.id || 'emp-ft',
      shiftId: workShifts[0]?.id || 'shift-1',
      cardId: '',
      fingerId: '',
      basicSalary: 18000,
      phone: '+880 1',
      email: '',
      nid: '',
      address: 'Dhaka',
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE'
    });
    setEditingEmpId(null);
    setIsEmpModalOpen(true);
  };

  const handleOpenEditEmp = (emp: Employee) => {
    setEmpForm({
      empCode: emp.empCode,
      name: emp.name,
      designation: emp.designation,
      department: emp.department,
      employmentTypeId: emp.employmentTypeId || employmentTypes[0]?.id || 'emp-ft',
      shiftId: emp.shiftId || workShifts[0]?.id || 'shift-1',
      cardId: emp.cardId || '',
      fingerId: emp.fingerId || '',
      basicSalary: emp.basicSalary,
      phone: emp.phone,
      email: emp.email || '',
      nid: emp.nid || '',
      address: emp.address || '',
      joiningDate: emp.joiningDate,
      status: emp.status
    });
    setEditingEmpId(emp.id);
    setIsEmpModalOpen(true);
  };

  const handleSaveEmp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.name.trim()) return;
    if (editingEmpId) {
      editEmployee(editingEmpId, empForm);
    } else {
      addEmployee(empForm);
    }
    setIsEmpModalOpen(false);
  };

  // Export Attendance to Excel
  const handleExportAttendance = () => {
    exportAttendanceToExcel(attendanceRecords, employees, attDateFilter);
  };

  // Quick Clock In trigger for dashboard or modal
  const handleOpenQuickClockIn = (emp?: Employee) => {
    const targetEmp = emp || employees[0];
    if (!targetEmp) return;
    const empShift = workShifts.find(s => s.id === targetEmp.shiftId) || workShifts[0];
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    let status: AttendanceRecord['status'] = 'PRESENT';
    if (empShift) {
      const [inH, inM] = currentTime.split(':').map(Number);
      const [startH, startM] = empShift.startTime.split(':').map(Number);
      const grace = empShift.graceMinutes || 15;
      if ((inH * 60 + inM) > (startH * 60 + startM + grace)) {
        status = 'LATE';
      }
    }

    setAttForm({
      employeeId: targetEmp.id,
      date: attDateFilter,
      shift: empShift?.name || 'Morning Shift',
      inTime: currentTime,
      outTime: empShift?.endTime || '17:00',
      status,
      workingHours: 8,
      overtimeHours: 0,
      notes: emp ? 'Dashboard Quick Clock-In' : 'Manual Clock-In'
    });
    setIsManualAttModalOpen(true);
  };

  // Quick 1-click Clock Out
  const handleClockOutRecord = (record: AttendanceRecord) => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const inTime = record.inTime || '09:00';
    const inParts = inTime.split(':').map(Number);
    const outParts = currentTime.split(':').map(Number);
    let diffMinutes = (outParts[0] * 60 + (outParts[1] || 0)) - (inParts[0] * 60 + (inParts[1] || 0));
    if (diffMinutes < 0) diffMinutes += 24 * 60;
    const workingHours = Math.round((diffMinutes / 60) * 10) / 10;
    const overtimeHours = workingHours > 8 ? Math.round((workingHours - 8) * 10) / 10 : 0;

    updateAttendanceRecord(record.id, {
      outTime: currentTime,
      workingHours: workingHours > 0 ? workingHours : 8,
      overtimeHours
    });
  };

  // Handle Biometric / Excel File Upload
  const handleAttendanceFileSelect = async (file: File) => {
    if (!file) return;
    setImportFile(file);
    setIsImportLoading(true);
    setImportSuccessMsg(null);
    try {
      const rawRows = await readSpreadsheetFile(file);
      const parsed = parseAttendanceSpreadsheet(rawRows, employees, workShifts, attDateFilter);
      setImportResult(parsed);
    } catch (err: any) {
      setImportResult({
        items: [],
        errors: [`Failed to parse attendance file: ${err?.message || 'Invalid format'}`],
        matchedEmployeesCount: 0
      });
    } finally {
      setIsImportLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (!importResult || importResult.items.length === 0) return;
    const res = bulkSyncAttendanceRecords(importResult.items);
    setImportSuccessMsg(`Successfully imported ${res.added} new attendance punches and updated ${res.updated} existing records!`);
    setTimeout(() => {
      setIsImportModalOpen(false);
      setImportFile(null);
      setImportResult(null);
      setImportSuccessMsg(null);
    }, 1500);
  };

  // Test connection to Biometric Device IP
  const handleTestDeviceIp = async () => {
    if (!deviceIp.trim()) {
      setIpTestStatus('ERROR');
      setIpTestMsg('Please enter a valid IP address.');
      return;
    }
    setIsTestingIp(true);
    setIpTestStatus('IDLE');
    setIpTestMsg('');
    localStorage.setItem('biometric_device_ip', deviceIp.trim());
    localStorage.setItem('biometric_device_port', devicePort.trim());

    try {
      const res = await fetch('/api/biometric/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: deviceIp.trim(), port: Number(devicePort) || 4370 })
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // Non-JSON response
      }

      if (!res.ok) {
        setIpTestStatus('ERROR');
        if (res.status === 404) {
          setIpTestMsg('API route not loaded (404). Please restart your localhost terminal (Ctrl+C and run start-localhost.bat / npm run dev) to activate the biometric routes.');
        } else {
          setIpTestMsg(data?.message || `Server returned error (${res.status}: ${res.statusText})`);
        }
        return;
      }

      if (data?.success) {
        setIpTestStatus('SUCCESS');
        setIpTestMsg(data.message || 'Connected to device successfully!');
      } else {
        setIpTestStatus('ERROR');
        setIpTestMsg(data?.message || 'Connection failed. Check IP & LAN.');
      }
    } catch (err: any) {
      setIpTestStatus('ERROR');
      setIpTestMsg(err?.message || 'Network error reaching server API.');
    } finally {
      setIsTestingIp(false);
    }
  };

  // Fetch Attendance Logs directly from Device Database via IP
  const handleFetchFromDevice = async () => {
    if (!deviceIp.trim()) return;
    setIsFetchingFromDevice(true);
    setIpFetchResult(null);
    setIpSyncSuccessMsg(null);
    localStorage.setItem('biometric_device_ip', deviceIp.trim());
    localStorage.setItem('biometric_device_port', devicePort.trim());

    try {
      const res = await fetch('/api/biometric/fetch-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: deviceIp.trim(),
          port: Number(devicePort) || 4370,
          date: ipFilterDate ? attDateFilter : undefined
        })
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // Non-JSON response
      }

      if (!res.ok) {
        setIpTestStatus('ERROR');
        if (res.status === 404) {
          setIpTestMsg('API route not loaded (404). Please restart your localhost terminal (Ctrl+C and run start-localhost.bat / npm run dev) to activate the biometric routes.');
        } else {
          setIpTestMsg(data?.message || `Server returned error (${res.status}: ${res.statusText})`);
        }
        setIsFetchingFromDevice(false);
        return;
      }

      if (!data?.success) {
        setIpTestStatus('ERROR');
        setIpTestMsg(data?.message || 'Failed to fetch logs from device.');
        setIsFetchingFromDevice(false);
        return;
      }

      const rawLogs: Array<{ deviceUserId: string; recordTime: string; date: string; time: string }> = data.logs || [];
      
      const groups = new Map<string, { userId: string; date: string; punches: string[] }>();
      rawLogs.forEach(l => {
        const key = `${l.deviceUserId}_${l.date}`;
        if (!groups.has(key)) {
          groups.set(key, { userId: l.deviceUserId, date: l.date, punches: [] });
        }
        if (l.time) {
          groups.get(key)!.punches.push(l.time);
        }
      });

      const matchedRecords: AttendanceRecord[] = [];
      const unmatchedIds = new Set<string>();
      let matchedCount = 0;

      groups.forEach(group => {
        const emp = employees.find(e => 
          (e.fingerId && e.fingerId.toLowerCase() === group.userId.toLowerCase()) ||
          (e.empCode && e.empCode.toLowerCase() === group.userId.toLowerCase()) ||
          (e.cardId && e.cardId.toLowerCase() === group.userId.toLowerCase()) ||
          e.id === group.userId
        );

        if (!emp) {
          unmatchedIds.add(group.userId);
          return;
        }

        matchedCount++;
        const empShift = workShifts.find(s => s.id === emp.shiftId) || workShifts[0];
        group.punches.sort();

        const inTime = group.punches[0] || '09:00';
        let outTime = group.punches.length > 1 ? group.punches[group.punches.length - 1] : undefined;
        if (outTime === inTime) outTime = undefined;

        let status: AttendanceRecord['status'] = 'PRESENT';
        if (empShift && inTime) {
          const [inH, inM] = inTime.split(':').map(Number);
          const [startH, startM] = empShift.startTime.split(':').map(Number);
          const grace = empShift.graceMinutes || 15;
          if ((inH * 60 + inM) > (startH * 60 + startM + grace)) {
            status = 'LATE';
          }
        }

        let workingHours = 8;
        if (inTime && outTime) {
          const [inH, inM] = inTime.split(':').map(Number);
          const [outH, outM] = outTime.split(':').map(Number);
          let diff = (outH * 60 + (outM || 0)) - (inH * 60 + (inM || 0));
          if (diff < 0) diff += 24 * 60;
          workingHours = Math.round((diff / 60) * 10) / 10;
        }

        matchedRecords.push({
          id: `att-device-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          employeeId: emp.id,
          employeeName: emp.name,
          date: group.date,
          shift: empShift ? empShift.name : 'General Shift',
          inTime,
          outTime,
          status,
          workingHours: workingHours > 0 ? workingHours : 8,
          overtimeHours: workingHours > 8 ? Math.round((workingHours - 8) * 10) / 10 : 0,
          notes: `Direct device IP sync (${group.punches.length} punches)`,
          punchSource: 'BIOMETRIC_DEVICE'
        });
      });

      setIpFetchResult({
        items: matchedRecords,
        matchedCount,
        unmatchedCount: unmatchedIds.size,
        totalDeviceLogs: data.totalDeviceLogs || rawLogs.length,
        unmatchedIds: Array.from(unmatchedIds)
      });
    } catch (err: any) {
      setIpTestStatus('ERROR');
      setIpTestMsg(err?.message || 'Failed to fetch logs from device.');
    } finally {
      setIsFetchingFromDevice(false);
    }
  };

  const handleApplyDeviceLogs = () => {
    if (!ipFetchResult || ipFetchResult.items.length === 0) return;
    const res = bulkSyncAttendanceRecords(ipFetchResult.items);
    setIpSyncSuccessMsg(`Successfully synced and saved ${res.added} new records and updated ${res.updated} existing records from device!`);
    setTimeout(() => {
      setIsIpSyncModalOpen(false);
      setIpFetchResult(null);
      setIpSyncSuccessMsg(null);
    }, 1500);
  };

  // Manual Attendance Handler (Direct Live Connection to Dashboard)
  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === attForm.employeeId);
    if (!emp) return;

    const existing = attendanceRecords.find(a => a.employeeId === emp.id && a.date === attForm.date);
    if (existing) {
      updateAttendanceRecord(existing.id, {
        shift: attForm.shift,
        inTime: attForm.inTime,
        outTime: attForm.outTime,
        status: attForm.status,
        workingHours: Number(attForm.workingHours) || 8,
        overtimeHours: Number(attForm.overtimeHours) || 0,
        notes: attForm.notes,
        punchSource: 'MANUAL'
      });
    } else {
      addAttendanceRecord({
        employeeId: emp.id,
        employeeName: emp.name,
        date: attForm.date,
        shift: attForm.shift,
        inTime: attForm.inTime,
        outTime: attForm.outTime,
        status: attForm.status,
        workingHours: Number(attForm.workingHours) || 8,
        overtimeHours: Number(attForm.overtimeHours) || 0,
        notes: attForm.notes,
        punchSource: 'MANUAL'
      });
    }
    setIsManualAttModalOpen(false);
    setAttDateFilter(attForm.date);
    setActiveTab('attendance');
  };

  // Leave Application Handler
  const handleSaveLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === leaveForm.employeeId);
    const lt = leaveTypes.find(l => l.id === leaveForm.leaveTypeId);
    if (!emp || !lt) return;

    addLeaveApplication({
      employeeId: emp.id,
      employeeName: emp.name,
      leaveTypeId: lt.id,
      leaveTypeName: lt.name,
      fromDate: leaveForm.fromDate,
      toDate: leaveForm.toDate,
      totalDays: Number(leaveForm.totalDays) || 1,
      reason: leaveForm.reason,
      status: 'PENDING',
      appliedDate: new Date().toISOString().split('T')[0]
    });
    setIsLeaveModalOpen(false);
  };

  // Filtered employees
  const filteredEmployees = employees.filter(e => {
    const q = empSearch.toLowerCase().trim();
    const matchSearch = !q ||
      e.name.toLowerCase().includes(q) || 
      e.empCode.toLowerCase().includes(q) || 
      e.designation.toLowerCase().includes(q) ||
      e.phone.includes(q) ||
      (e.cardId && e.cardId.toLowerCase().includes(q)) ||
      (e.fingerId && e.fingerId.toLowerCase().includes(q));
    const matchDept = empDeptFilter === 'ALL' || e.department === empDeptFilter;
    return matchSearch && matchDept;
  });

  // Filtered attendance for selected date
  const filteredAttendance = attendanceRecords.filter(a => a.date === attDateFilter);

  // Present/Late stats for today
  const totalPresentToday = filteredAttendance.filter(a => a.status === 'PRESENT').length;
  const totalLateToday = filteredAttendance.filter(a => a.status === 'LATE').length;
  const totalAbsentToday = Math.max(0, employees.length - filteredAttendance.length);

  return (
    <div className="space-y-6">
      {/* Header & Section Navigation */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              HR & Payroll Management
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                Staff & Roster
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Manage restaurant employees, daily attendance tracking, leave requests, work shifts, and HR configurations
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'employee-manager' && (
            <button
              onClick={handleOpenAddEmp}
              className="px-4 py-2 bg-[#004b9b] hover:bg-[#005bb8] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-900/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Employee
            </button>
          )}
          {activeTab === 'manual-attendance' && (
            <button
              onClick={() => setIsManualAttModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition cursor-pointer"
            >
              <Timer className="w-4 h-4" /> Clock In / Record Entry
            </button>
          )}
          {activeTab === 'leave-application' && (
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Apply Leave Request
            </button>
          )}
        </div>
      </div>

      {/* Sub Navigation Bar Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 custom-scrollbar">
        <button
          onClick={() => setActiveTab('employee-manager')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'employee-manager'
              ? 'bg-slate-900 text-amber-400 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          Employee Manager ({employees.length})
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'attendance'
              ? 'bg-slate-900 text-amber-400 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          Attendance Dashboard
        </button>

        <button
          onClick={() => setActiveTab('manual-attendance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'manual-attendance'
              ? 'bg-slate-900 text-amber-400 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Timer className="w-4 h-4" />
          Manual Attendance Entry
        </button>

        <button
          onClick={() => setActiveTab('leave-application')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'leave-application'
              ? 'bg-slate-900 text-amber-400 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Leave Applications ({leaveApplications.filter(l => l.status === 'PENDING').length} Pending)
        </button>

        <div className="h-6 w-px bg-slate-300 mx-1" />

        <button
          onClick={() => setActiveTab('settings-employment')}
          className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'settings-employment'
              ? 'bg-[#004b9b] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          Employment Types
        </button>

        <button
          onClick={() => setActiveTab('settings-shift')}
          className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'settings-shift'
              ? 'bg-[#004b9b] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Work Shifts
        </button>

        <button
          onClick={() => setActiveTab('settings-leave')}
          className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'settings-leave'
              ? 'bg-[#004b9b] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Leave Types
        </button>
      </div>

      {/* 1. EMPLOYEE MANAGER TAB */}
      {activeTab === 'employee-manager' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employee by name, code (EMP-01), designation, phone, Card ID, Finger ID..."
                value={empSearch}
                onChange={e => setEmpSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:border-amber-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Department:</span>
              <select
                value={empDeptFilter}
                onChange={e => setEmpDeptFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                <option value="Management">Management</option>
                <option value="Main Kitchen">Main Kitchen</option>
                <option value="Floor Service">Floor Service</option>
                <option value="Beverage Counter">Beverage Counter</option>
                <option value="Billing Counter">Billing Counter</option>
              </select>
            </div>
          </div>

          {/* Employee Directory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Department & Role</th>
                    <th className="py-3.5 px-4">Work Shift</th>
                    <th className="py-3.5 px-4">Monthly Salary</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No employees found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map(emp => {
                      const shift = workShifts.find(s => s.id === emp.shiftId);
                      const empType = employmentTypes.find(t => t.id === emp.employmentTypeId);

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                                {emp.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                  {emp.name}
                                </div>
                                <div className="text-[11px] font-mono text-amber-600 font-semibold">
                                  {emp.empCode} • Joined {emp.joiningDate}
                                </div>
                                {(emp.cardId || emp.fingerId) && (
                                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-600 mt-1 flex-wrap">
                                    {emp.cardId && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-medium">
                                        💳 Card: {emp.cardId}
                                      </span>
                                    )}
                                    {emp.fingerId && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                                        👆 Finger: {emp.fingerId}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{emp.designation}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1">
                              <span>{emp.department}</span>
                              {empType && (
                                <span className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 text-[10px]">
                                  {empType.code}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-medium text-[11px] border border-indigo-100">
                              {shift?.name || 'Morning Shift'}
                            </span>
                            {shift && (
                              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                {shift.startTime} - {shift.endTime}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-extrabold text-slate-900">
                              ৳{emp.basicSalary.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-400 block">/ Month</span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            <div className="flex items-center gap-1 font-mono text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {emp.phone}
                            </div>
                            {emp.email && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                {emp.email}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                              emp.status === 'ACTIVE' 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                : emp.status === 'ON_LEAVE'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}>
                              {emp.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditEmp(emp)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                title="Edit employee"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to remove ${emp.name}?`)) {
                                    deleteEmployee(emp.id);
                                  }
                                }}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Delete employee"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. ATTENDANCE DASHBOARD TAB */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {/* Attendance KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-slate-500 text-xs font-semibold">Total Staff</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{employees.length}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Enrolled restaurant staff</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <div className="text-emerald-700 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Present Today
              </div>
              <div className="text-2xl font-black text-emerald-800 mt-1">{totalPresentToday}</div>
              <div className="text-[11px] text-emerald-600 mt-0.5">On time check-in</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
              <div className="text-amber-700 text-xs font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Late Check-in
              </div>
              <div className="text-2xl font-black text-amber-800 mt-1">{totalLateToday}</div>
              <div className="text-[11px] text-amber-600 mt-0.5">Checked-in after grace period</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
              <div className="text-rose-700 text-xs font-bold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Absent / Unrecorded
              </div>
              <div className="text-2xl font-black text-rose-800 mt-1">{totalAbsentToday}</div>
              <div className="text-[11px] text-rose-600 mt-0.5">Pending attendance punch</div>
            </div>
          </div>

          {/* Date Selector, Toolbar Actions & Attendance Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-700">Attendance Date:</span>
                  <input
                    type="date"
                    value={attDateFilter}
                    onChange={e => setAttDateFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-amber-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setAttViewMode('ALL_STAFF')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      attViewMode === 'ALL_STAFF'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    All Staff ({employees.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttViewMode('PUNCHED_ONLY')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      attViewMode === 'PUNCHED_ONLY'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Punched Only ({filteredAttendance.length})
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportAttendance}
                  title="Export this day's attendance sheet to Excel (.xlsx)"
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export Excel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setImportFile(null);
                    setImportResult(null);
                    setImportSuccessMsg(null);
                    setIsImportModalOpen(true);
                  }}
                  title="Import punches from ZKTeco/Realand biometric device or Excel spreadsheet"
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Fingerprint className="w-3.5 h-3.5 text-indigo-600" /> Import Device / Excel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsIpSyncModalOpen(true);
                    setIpTestStatus('IDLE');
                    setIpFetchResult(null);
                    setIpSyncSuccessMsg(null);
                  }}
                  title="Connect directly to Fingerprint Device via IP address and fetch attendance logs from device database"
                  className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-blue-500/25"
                >
                  <Wifi className="w-3.5 h-3.5 text-blue-200" /> Connect Device (IP)
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenQuickClockIn()}
                  className="px-3.5 py-1.5 bg-slate-900 text-amber-400 hover:bg-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Quick Clock In Entry
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Assigned Shift</th>
                    <th className="py-3 px-4">Clock In</th>
                    <th className="py-3 px-4">Clock Out</th>
                    <th className="py-3 px-4">Total Hours</th>
                    <th className="py-3 px-4">Status & Source</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attViewMode === 'ALL_STAFF' ? (
                    employees.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No employees enrolled in restaurant yet. Add staff from Employee Manager.
                        </td>
                      </tr>
                    ) : (
                      employees.map(emp => {
                        const att = filteredAttendance.find(a => a.employeeId === emp.id);
                        const empShift = workShifts.find(s => s.id === emp.shiftId);

                        if (att) {
                          return (
                            <tr key={emp.id} className="hover:bg-slate-50">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{emp.name}</div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                  <span>{emp.empCode} • {emp.designation}</span>
                                  {emp.fingerId && (
                                    <span className="inline-flex items-center gap-0.5 text-indigo-600 font-mono font-medium">
                                      <Fingerprint className="w-2.5 h-2.5" /> FP: {emp.fingerId}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-slate-600">
                                <span className="font-medium">{att.shift || empShift?.name || 'General Shift'}</span>
                              </td>
                              <td className="py-3 px-4 font-mono font-semibold text-emerald-700">
                                {att.inTime}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-600">
                                {att.outTime || '--:--'}
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-800">
                                {att.workingHours || 8} hrs
                                {att.overtimeHours ? (
                                  <span className="ml-1 text-[10px] font-bold text-amber-600">
                                    (+{att.overtimeHours}h OT)
                                  </span>
                                ) : null}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    att.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                                    att.status === 'LATE' ? 'bg-amber-100 text-amber-800' : 
                                    att.status === 'HALF_DAY' ? 'bg-sky-100 text-sky-800' :
                                    att.status === 'LEAVE' ? 'bg-purple-100 text-purple-800' :
                                    'bg-rose-100 text-rose-800'
                                  }`}>
                                    {att.status}
                                  </span>
                                  {att.punchSource && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-tight uppercase bg-slate-100 text-slate-500 border border-slate-200">
                                      {att.punchSource === 'BIOMETRIC_DEVICE' ? 'BIOMETRIC' :
                                       att.punchSource === 'EXCEL_IMPORT' ? 'EXCEL' : 'MANUAL'}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {!att.outTime && (
                                    <button
                                      type="button"
                                      onClick={() => handleClockOutRecord(att)}
                                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] rounded-lg transition cursor-pointer flex items-center gap-1 shadow-xs"
                                      title="Record staff clock-out punch right now"
                                    >
                                      <Clock className="w-3 h-3" /> Clock Out
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => deleteAttendanceRecord(att.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                    title="Delete attendance record"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        // Employee is absent / unpunched
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/70 bg-rose-50/10">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-800">{emp.name}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{emp.empCode} • {emp.designation}</span>
                                {emp.fingerId && (
                                  <span className="inline-flex items-center gap-0.5 text-slate-400 font-mono">
                                    <Fingerprint className="w-2.5 h-2.5" /> FP: {emp.fingerId}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {empShift?.name || 'General Shift'}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400">--:--</td>
                            <td className="py-3 px-4 font-mono text-slate-400">--:--</td>
                            <td className="py-3 px-4 text-slate-400">0 hrs</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                ABSENT / UNRECORDED
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleOpenQuickClockIn(emp)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg transition cursor-pointer flex items-center gap-1 shadow-xs ml-auto"
                                title="Quick clock-in entry for this employee"
                              >
                                <Timer className="w-3 h-3" /> Clock In
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )
                  ) : (
                    filteredAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No attendance records logged for {attDateFilter}. Click "Quick Clock In Entry" or "Import Device / Excel" to log attendance.
                        </td>
                      </tr>
                    ) : (
                      filteredAttendance.map(att => {
                        const emp = employees.find(e => e.id === att.employeeId);
                        return (
                          <tr key={att.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{att.employeeName}</div>
                              {emp && (
                                <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                  <span>{emp.empCode} • {emp.designation}</span>
                                  {emp.fingerId && (
                                    <span className="inline-flex items-center gap-0.5 text-indigo-600 font-mono font-medium">
                                      <Fingerprint className="w-2.5 h-2.5" /> FP: {emp.fingerId}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-600">{att.shift}</td>
                            <td className="py-3 px-4 font-mono font-semibold text-emerald-700">{att.inTime}</td>
                            <td className="py-3 px-4 font-mono text-slate-600">{att.outTime || '--:--'}</td>
                            <td className="py-3 px-4 font-semibold text-slate-800">{att.workingHours || 8} hrs</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  att.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                                  att.status === 'LATE' ? 'bg-amber-100 text-amber-800' : 
                                  att.status === 'HALF_DAY' ? 'bg-sky-100 text-sky-800' :
                                  att.status === 'LEAVE' ? 'bg-purple-100 text-purple-800' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  {att.status}
                                </span>
                                {att.punchSource && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200">
                                    {att.punchSource === 'BIOMETRIC_DEVICE' ? 'BIOMETRIC' :
                                     att.punchSource === 'EXCEL_IMPORT' ? 'EXCEL' : 'MANUAL'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {!att.outTime && (
                                  <button
                                    type="button"
                                    onClick={() => handleClockOutRecord(att)}
                                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] rounded-lg transition cursor-pointer flex items-center gap-1 shadow-xs"
                                    title="Record staff clock-out punch right now"
                                  >
                                    <Clock className="w-3 h-3" /> Clock Out
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => deleteAttendanceRecord(att.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Delete record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. MANUAL ATTENDANCE TAB */}
      {activeTab === 'manual-attendance' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Manual Attendance Clock In/Out</h2>
              <p className="text-xs text-slate-500">Record staff punch time, custom working hours, and overtime</p>
            </div>
          </div>

          <form onSubmit={handleSaveAttendance} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Employee *</label>
                <select
                  value={attForm.employeeId}
                  onChange={e => {
                    const selId = e.target.value;
                    const emp = employees.find(x => x.id === selId);
                    const empShift = emp ? workShifts.find(s => s.id === emp.shiftId) : null;
                    setAttForm({
                      ...attForm,
                      employeeId: selId,
                      shift: empShift ? empShift.name : attForm.shift,
                      inTime: empShift?.startTime || attForm.inTime,
                      outTime: empShift?.endTime || attForm.outTime
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-amber-500 cursor-pointer"
                  required
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.empCode} • {emp.designation}{emp.fingerId ? ` • Finger: ${emp.fingerId}` : ''}{emp.cardId ? ` • Card: ${emp.cardId}` : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Attendance Date *</label>
                <input
                  type="date"
                  value={attForm.date}
                  onChange={e => setAttForm({ ...attForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Shift</label>
                <select
                  value={attForm.shift}
                  onChange={e => {
                    const shiftName = e.target.value;
                    const s = workShifts.find(x => x.name === shiftName);
                    setAttForm({
                      ...attForm,
                      shift: shiftName,
                      inTime: s?.startTime || attForm.inTime,
                      outTime: s?.endTime || attForm.outTime
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  {workShifts.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.startTime} - {s.endTime})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Attendance Status *</label>
                <select
                  value={attForm.status}
                  onChange={e => setAttForm({ ...attForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  <option value="PRESENT">PRESENT (On-time)</option>
                  <option value="LATE">LATE (Delayed check-in)</option>
                  <option value="HALF_DAY">HALF DAY</option>
                  <option value="LEAVE">ON APPROVED LEAVE</option>
                  <option value="ABSENT">ABSENT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Clock In Time</label>
                <input
                  type="time"
                  value={attForm.inTime}
                  onChange={e => setAttForm({ ...attForm, inTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Clock Out Time</label>
                <input
                  type="time"
                  value={attForm.outTime}
                  onChange={e => setAttForm({ ...attForm, outTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Remarks / Note</label>
              <input
                type="text"
                placeholder="e.g. Approved shift swap or special kitchen banquet overtime"
                value={attForm.notes}
                onChange={e => setAttForm({ ...attForm, notes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Record Attendance Punch
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. LEAVE APPLICATION TAB */}
      {activeTab === 'leave-application' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Staff Leave Requests & Approvals</h2>
                <p className="text-xs text-slate-500">Track and approve casual, medical, and earned leave requests</p>
              </div>

              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> New Leave Application
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Leave Type</th>
                    <th className="py-3.5 px-4">Date Range</th>
                    <th className="py-3.5 px-4">Days</th>
                    <th className="py-3.5 px-4">Reason</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaveApplications.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No leave applications recorded. Click "New Leave Application" to file a request.
                      </td>
                    </tr>
                  ) : (
                    leaveApplications.map(leave => (
                      <tr key={leave.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{leave.employeeName}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[11px]">
                            {leave.leaveTypeName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {leave.fromDate} <span className="text-slate-400">to</span> {leave.toDate}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{leave.totalDays} Days</td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{leave.reason}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            leave.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                            leave.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800 animate-pulse'
                          }`}>
                            {leave.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {leave.status === 'PENDING' ? (
                              <>
                                <button
                                  onClick={() => updateLeaveStatus(leave.id, 'APPROVED')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => updateLeaveStatus(leave.id, 'REJECTED')}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => deleteLeaveApplication(leave.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="Delete application"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. SETTINGS: EMPLOYMENT TYPES TAB */}
      {activeTab === 'settings-employment' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Employment Contract Types</h2>
              <p className="text-xs text-slate-500">Configure full-time, part-time, trainee and contractor categories</p>
            </div>
            <button
              onClick={() => {
                setEmpTypeForm({ name: '', code: '', description: '' });
                setEditingEmpTypeId(null);
                setIsEmpTypeModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-[#004b9b] hover:bg-[#005bb8] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Type
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {employmentTypes.map(t => (
              <div key={t.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{t.name}</span>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-mono font-bold text-[10px] rounded">
                    {t.code}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{t.description || 'Standard employment terms'}</p>
                <div className="pt-2 flex justify-end gap-1">
                  <button
                    onClick={() => {
                      setEmpTypeForm({ name: t.name, code: t.code, description: t.description });
                      setEditingEmpTypeId(t.id);
                      setIsEmpTypeModalOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteEmploymentType(t.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. SETTINGS: WORK SHIFTS TAB */}
      {activeTab === 'settings-shift' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Work Shifts & Timings</h2>
              <p className="text-xs text-slate-500">Configure morning, evening, night, and split service shifts</p>
            </div>
            <button
              onClick={() => {
                setShiftForm({ name: '', startTime: '09:00', endTime: '17:00', graceMinutes: 15, isDefault: false });
                setEditingShiftId(null);
                setIsShiftModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-[#004b9b] hover:bg-[#005bb8] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Shift
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {workShifts.map(s => (
              <div key={s.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{s.name}</span>
                  {s.isDefault && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded">
                      Default
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600 font-mono">
                  ⏰ {s.startTime} - {s.endTime}
                </div>
                <div className="text-[11px] text-slate-500">
                  Grace Period: <span className="font-bold text-slate-700">{s.graceMinutes} min</span>
                </div>
                <div className="pt-2 flex justify-end gap-1 border-t border-slate-200/60">
                  <button
                    onClick={() => {
                      setShiftForm({ name: s.name, startTime: s.startTime, endTime: s.endTime, graceMinutes: s.graceMinutes, isDefault: s.isDefault });
                      setEditingShiftId(s.id);
                      setIsShiftModalOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteWorkShift(s.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. SETTINGS: LEAVE TYPES TAB */}
      {activeTab === 'settings-leave' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Leave Policies & Quotas</h2>
              <p className="text-xs text-slate-500">Manage allowed yearly quota for casual, medical, and annual leaves</p>
            </div>
            <button
              onClick={() => {
                setLeaveTypeForm({ name: '', code: '', daysAllowedPerYear: 10, isPaid: true });
                setEditingLeaveTypeId(null);
                setIsLeaveTypeModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-[#004b9b] hover:bg-[#005bb8] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Leave Type
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {leaveTypes.map(lt => (
              <div key={lt.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{lt.name}</span>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-mono font-bold text-[10px] rounded">
                    {lt.code}
                  </span>
                </div>
                <div className="text-xs text-slate-700 font-bold">
                  Quota: {lt.daysAllowedPerYear} Days / Year
                </div>
                <div className="text-[11px] text-slate-500">
                  Type: <span className="font-semibold text-emerald-700">{lt.isPaid ? 'Paid Leave' : 'Unpaid Leave'}</span>
                </div>
                <div className="pt-2 flex justify-end gap-1 border-t border-slate-200/60">
                  <button
                    onClick={() => {
                      setLeaveTypeForm({ name: lt.name, code: lt.code, daysAllowedPerYear: lt.daysAllowedPerYear, isPaid: lt.isPaid });
                      setEditingLeaveTypeId(lt.id);
                      setIsLeaveTypeModalOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteLeaveType(lt.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}

      {/* 1. Add / Edit Employee Modal */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingEmpId ? 'Edit Employee Profile' : 'Add New Restaurant Employee'}
              </h3>
              <button onClick={() => setIsEmpModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmp} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Employee Code *</label>
                  <input
                    type="text"
                    value={empForm.empCode}
                    onChange={e => setEmpForm({ ...empForm, empCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-hidden focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Rahim Ullah"
                    value={empForm.name}
                    onChange={e => setEmpForm({ ...empForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-hidden focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Designation *</label>
                  <input
                    type="text"
                    placeholder="e.g. Head Chef, Floor Steward"
                    value={empForm.designation}
                    onChange={e => setEmpForm({ ...empForm, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department *</label>
                  <select
                    value={empForm.department}
                    onChange={e => setEmpForm({ ...empForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Main Kitchen">Main Kitchen</option>
                    <option value="Floor Service">Floor Service</option>
                    <option value="Beverage Counter">Beverage Counter</option>
                    <option value="Billing Counter">Billing Counter</option>
                    <option value="Management">Management</option>
                  </select>
                </div>

                {/* Work Shift */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Work Shift *</label>
                  <select
                    value={empForm.shiftId}
                    onChange={e => setEmpForm({ ...empForm, shiftId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:border-amber-500 cursor-pointer"
                    required
                  >
                    {workShifts.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime} - {s.endTime})
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const selectedShift = workShifts.find(s => s.id === empForm.shiftId);
                    if (!selectedShift) return null;
                    return (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-indigo-700 bg-indigo-50/90 px-2 py-1 rounded-lg border border-indigo-100">
                        <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                        <span>ডিউটি সময়: <strong className="font-mono">{selectedShift.startTime} - {selectedShift.endTime}</strong> (গ্রেস: {selectedShift.graceMinutes || 0} মিনিট)</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Monthly Salary */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monthly Salary (৳) *</label>
                  <input
                    type="number"
                    value={empForm.basicSalary}
                    onChange={e => setEmpForm({ ...empForm, basicSalary: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-hidden focus:border-amber-500"
                    required
                  />
                </div>

                {/* Card ID */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Card ID (RFID / Card No)</label>
                  <input
                    type="text"
                    placeholder="e.g. CRD-101 or Card UID"
                    value={empForm.cardId || ''}
                    onChange={e => setEmpForm({ ...empForm, cardId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                {/* Finger ID */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Finger ID / Biometric ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 101 or Machine User ID"
                    value={empForm.fingerId || ''}
                    onChange={e => setEmpForm({ ...empForm, fingerId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    value={empForm.phone}
                    onChange={e => setEmpForm({ ...empForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-hidden focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={empForm.joiningDate}
                    onChange={e => setEmpForm({ ...empForm, joiningDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Employment Type</label>
                  <select
                    value={empForm.employmentTypeId}
                    onChange={e => setEmpForm({ ...empForm, employmentTypeId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500 cursor-pointer"
                  >
                    {employmentTypes.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={empForm.status}
                    onChange={e => setEmpForm({ ...empForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500 cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_LEAVE">ON LEAVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEmpModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#004b9b] text-white font-bold rounded-xl hover:bg-[#005bb8] shadow-md shadow-blue-900/20 cursor-pointer"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Leave Application Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Apply Leave Request</h3>
              <button onClick={() => setIsLeaveModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLeave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Employee *</label>
                <select
                  value={leaveForm.employeeId}
                  onChange={e => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-hidden focus:border-amber-500 cursor-pointer"
                  required
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.empCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Leave Category *</label>
                <select
                  value={leaveForm.leaveTypeId}
                  onChange={e => setLeaveForm({ ...leaveForm, leaveTypeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  {leaveTypes.map(lt => (
                    <option key={lt.id} value={lt.id}>{lt.name} ({lt.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">From Date *</label>
                  <input
                    type="date"
                    value={leaveForm.fromDate}
                    onChange={e => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">To Date *</label>
                  <input
                    type="date"
                    value={leaveForm.toDate}
                    onChange={e => setLeaveForm({ ...leaveForm, toDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Total Days *</label>
                <input
                  type="number"
                  min={1}
                  value={leaveForm.totalDays}
                  onChange={e => setLeaveForm({ ...leaveForm, totalDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Leave</label>
                <textarea
                  rows={3}
                  value={leaveForm.reason}
                  onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="State the reason for leave application..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 shadow-md shadow-emerald-500/20"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Shift Modal */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingShiftId ? 'Edit Work Shift' : 'Add New Work Shift'}
              </h3>
              <button onClick={() => setIsShiftModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                if (!shiftForm.name.trim()) return;
                if (editingShiftId) {
                  editWorkShift(editingShiftId, shiftForm);
                } else {
                  addWorkShift(shiftForm);
                }
                setIsShiftModalOpen(false);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Shift Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Dinner Shift, Rooftop Closing"
                  value={shiftForm.name}
                  onChange={e => setShiftForm({ ...shiftForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={shiftForm.startTime}
                    onChange={e => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-hidden focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Time *</label>
                  <input
                    type="time"
                    value={shiftForm.endTime}
                    onChange={e => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-hidden focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Grace Period (Minutes)</label>
                <input
                  type="number"
                  min={0}
                  value={shiftForm.graceMinutes}
                  onChange={e => setShiftForm({ ...shiftForm, graceMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#004b9b] text-white font-bold rounded-xl hover:bg-[#005bb8]"
                >
                  Save Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Attendance Clock In / Out Modal */}
      {isManualAttModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Timer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Attendance Clock In / Out Entry</h3>
                  <p className="text-[11px] text-slate-500">Log staff punch time, custom working hours, and shift status</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsManualAttModalOpen(false)} 
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAttendance} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Select Employee *</label>
                  <select
                    value={attForm.employeeId}
                    onChange={e => {
                      const selId = e.target.value;
                      const emp = employees.find(x => x.id === selId);
                      const empShift = emp ? workShifts.find(s => s.id === emp.shiftId) : null;
                      setAttForm({
                        ...attForm,
                        employeeId: selId,
                        shift: empShift ? empShift.name : attForm.shift,
                        inTime: empShift?.startTime || attForm.inTime,
                        outTime: empShift?.endTime || attForm.outTime
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                    required
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.empCode} • {emp.designation}{emp.fingerId ? ` • FP: ${emp.fingerId}` : ''})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Attendance Date *</label>
                  <input
                    type="date"
                    value={attForm.date}
                    onChange={e => setAttForm({ ...attForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned Shift</label>
                  <select
                    value={attForm.shift}
                    onChange={e => {
                      const shiftName = e.target.value;
                      const s = workShifts.find(x => x.name === shiftName);
                      setAttForm({
                        ...attForm,
                        shift: shiftName,
                        inTime: s?.startTime || attForm.inTime,
                        outTime: s?.endTime || attForm.outTime
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                  >
                    {workShifts.map(s => (
                      <option key={s.id} value={s.name}>{s.name} ({s.startTime} - {s.endTime})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Clock In Time *</label>
                  <input
                    type="time"
                    value={attForm.inTime}
                    onChange={e => setAttForm({ ...attForm, inTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-semibold focus:outline-hidden focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Clock Out Time</label>
                  <input
                    type="time"
                    value={attForm.outTime || ''}
                    onChange={e => setAttForm({ ...attForm, outTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-semibold focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Attendance Status *</label>
                  <select
                    value={attForm.status}
                    onChange={e => setAttForm({ ...attForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="PRESENT">PRESENT (On-time)</option>
                    <option value="LATE">LATE (Delayed check-in)</option>
                    <option value="HALF_DAY">HALF DAY</option>
                    <option value="LEAVE">ON APPROVED LEAVE</option>
                    <option value="ABSENT">ABSENT</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Working Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={attForm.workingHours}
                    onChange={e => setAttForm({ ...attForm, workingHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Verified by floor supervisor"
                  value={attForm.notes}
                  onChange={e => setAttForm({ ...attForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualAttModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 shadow-md shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Save Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Biometric Device & Excel Attendance Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Import Fingerprint Device / Excel Attendance</h3>
                  <p className="text-xs text-slate-500">Upload .xlsx, .xls or .csv export from ZKTeco, Realand, or attendance log sheets</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsImportModalOpen(false)} 
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template & Instructions Header */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-800">Supported Formats:</div>
                <div className="text-slate-500 text-[11px]">
                  Matches staff by <strong>Finger ID</strong>, <strong>Employee Code</strong>, or <strong>Name</strong>. Auto-calculates Clock-In, Clock-Out, and Late grace periods based on shifts.
                </div>
              </div>
              <button
                type="button"
                onClick={() => generateAttendanceTemplateExcel()}
                className="px-3 py-1.5 bg-white text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-200 font-bold rounded-lg shrink-0 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" /> Sample Template (.xlsx)
              </button>
            </div>

            {/* Drag & Drop File Upload Area */}
            <div
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={e => { e.preventDefault(); setDragActive(false); }}
              onDrop={e => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleAttendanceFileSelect(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${
                dragActive ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
              }`}
            >
              <input
                type="file"
                id="attendance-excel-file"
                accept=".xlsx, .xls, .csv"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    handleAttendanceFileSelect(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <label htmlFor="attendance-excel-file" className="cursor-pointer block space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-600 hover:underline">Click to browse</span>
                  <span className="text-xs text-slate-500"> or drag and drop your spreadsheet</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Microsoft Excel (.xlsx, .xls) and CSV (.csv) attendance logs
                </div>
              </label>

              {importFile && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-xs">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>{importFile.name}</span>
                  <span className="text-slate-400 font-mono">({Math.round(importFile.size / 1024)} KB)</span>
                </div>
              )}
            </div>

            {/* Loading Indicator */}
            {isImportLoading && (
              <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                Parsing attendance punches & calculating shift status...
              </div>
            )}

            {/* Parse Result Preview */}
            {importResult && !isImportLoading && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                    <div className="text-xl font-black text-indigo-700">{importResult.items.length}</div>
                    <div className="text-[11px] font-semibold text-indigo-600">Total Punches Found</div>
                  </div>
                  <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                    <div className="text-xl font-black text-emerald-700">{importResult.matchedEmployeesCount}</div>
                    <div className="text-[11px] font-semibold text-emerald-600">Matched Employees</div>
                  </div>
                  <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                    <div className="text-xl font-black text-amber-700">{importResult.errors.length}</div>
                    <div className="text-[11px] font-semibold text-amber-600">Unmatched / Errors</div>
                  </div>
                </div>

                {/* Error warnings if any */}
                {importResult.errors.length > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 space-y-1 max-h-24 overflow-y-auto">
                    <div className="font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Notice:
                    </div>
                    {importResult.errors.slice(0, 5).map((err, i) => (
                      <div key={i} className="text-[11px] pl-4 list-disc">• {err}</div>
                    ))}
                    {importResult.errors.length > 5 && (
                      <div className="text-[10px] text-rose-500 italic">...and {importResult.errors.length - 5} more</div>
                    )}
                  </div>
                )}

                {/* Table Preview */}
                {importResult.items.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                      Attendance Records Preview (First 5 records):
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-100 text-slate-500 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Employee</th>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Clock In</th>
                            <th className="py-2 px-3">Clock Out</th>
                            <th className="py-2 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {importResult.items.slice(0, 5).map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-bold text-slate-800">{item.employeeName}</td>
                              <td className="py-2 px-3 text-slate-600 font-mono">{item.date}</td>
                              <td className="py-2 px-3 text-emerald-700 font-mono font-semibold">{item.inTime}</td>
                              <td className="py-2 px-3 text-slate-600 font-mono">{item.outTime || '--:--'}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  item.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                                  item.status === 'LATE' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Success Message */}
            {importSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {importSuccessMsg}
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!importResult || importResult.items.length === 0 || isImportLoading}
                onClick={handleConfirmImport}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Check className="w-4 h-4" /> Confirm & Import {importResult?.items.length ? `(${importResult.items.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Biometric Device IP Direct Sync Modal */}
      {isIpSyncModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Connect Fingerprint Device via IP</h3>
                  <p className="text-xs text-slate-500">
                    Fetch attendance punch database directly from ZKTeco/Realand biometric machine over local LAN/WiFi (TCP Port 4370)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsIpSyncModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* IP Connection Form Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-blue-600" /> Device IP Address *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 192.168.1.201"
                    value={deviceIp}
                    onChange={e => setDeviceIp(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 focus:outline-hidden focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Find device IP in machine: <em>Menu &gt; Comm. &gt; Ethernet / Network</em>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-slate-500" /> Port
                  </label>
                  <input
                    type="text"
                    value={devicePort}
                    onChange={e => setDevicePort(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 focus:outline-hidden focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Default: 4370</span>
                </div>
              </div>

              {/* Date Filter & Test Action */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={ipFilterDate}
                    onChange={e => setIpFilterDate(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Fetch only for selected date ({attDateFilter})</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isTestingIp || isFetchingFromDevice}
                    onClick={handleTestDeviceIp}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    {isTestingIp ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    ) : (
                      <Radio className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    Test Connection
                  </button>

                  <button
                    type="button"
                    disabled={isFetchingFromDevice || isTestingIp}
                    onClick={handleFetchFromDevice}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    {isFetchingFromDevice ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Database className="w-3.5 h-3.5" />
                    )}
                    Fetch Device Logs
                  </button>
                </div>
              </div>

              {/* Test Status Banner */}
              {ipTestStatus !== 'IDLE' && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    ipTestStatus === 'SUCCESS'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {ipTestStatus === 'SUCCESS' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{ipTestMsg}</span>
                </div>
              )}
            </div>

            {/* Fetching Progress */}
            {isFetchingFromDevice && (
              <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                <span className="font-semibold text-slate-700">Connecting to device socket ({deviceIp}:{devicePort})...</span>
                <span className="text-[11px] text-slate-400">Downloading punch records, matching Employee Finger IDs, and calculating shift status</span>
              </div>
            )}

            {/* Fetched Logs Preview */}
            {ipFetchResult && !isFetchingFromDevice && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <div className="text-xl font-black text-blue-700">{ipFetchResult.items.length}</div>
                    <div className="text-[11px] font-semibold text-blue-600">Punches Ready</div>
                  </div>
                  <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                    <div className="text-xl font-black text-emerald-700">{ipFetchResult.matchedCount}</div>
                    <div className="text-[11px] font-semibold text-emerald-600">Matched Staff</div>
                  </div>
                  <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl">
                    <div className="text-xl font-black text-slate-700">{ipFetchResult.totalDeviceLogs}</div>
                    <div className="text-[11px] font-semibold text-slate-500">Total in Device Memory</div>
                  </div>
                </div>

                {ipFetchResult.unmatchedCount > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Note on unmatched IDs:
                    </div>
                    <p className="text-[11px] text-amber-700">
                      {ipFetchResult.unmatchedCount} device user ID(s) ({ipFetchResult.unmatchedIds.slice(0, 5).join(', ')}) were found in the machine but have not yet been assigned to any employee in Employee Manager.
                    </p>
                  </div>
                )}

                {ipFetchResult.items.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600 border-b border-slate-200 flex items-center justify-between">
                      <span>Fetched Punches Preview:</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Ready to sync into Attendance Dashboard
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-100 text-slate-500 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Staff Name</th>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Clock In</th>
                            <th className="py-2 px-3">Clock Out</th>
                            <th className="py-2 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ipFetchResult.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-bold text-slate-800">{item.employeeName}</td>
                              <td className="py-2 px-3 text-slate-600 font-mono">{item.date}</td>
                              <td className="py-2 px-3 text-emerald-700 font-mono font-semibold">{item.inTime}</td>
                              <td className="py-2 px-3 text-slate-600 font-mono">{item.outTime || '--:--'}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  item.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                                  item.status === 'LATE' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                    No matching attendance logs found on device for {ipFilterDate ? attDateFilter : 'the device database'}.
                  </div>
                )}
              </div>
            )}

            {/* Sync Success Message */}
            {ipSyncSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {ipSyncSuccessMsg}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsIpSyncModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!ipFetchResult || ipFetchResult.items.length === 0 || isFetchingFromDevice}
                onClick={handleApplyDeviceLogs}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Check className="w-4 h-4" /> Save &amp; Apply to Dashboard {ipFetchResult?.items.length ? `(${ipFetchResult.items.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
