import React, { useState } from 'react';
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
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Building2,
  Timer,
  Check,
  X
} from 'lucide-react';

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
    deleteAttendanceRecord,
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
    basicSalary: 18000,
    phone: '+880 1700-000000',
    email: '',
    nid: '',
    address: 'Banani, Dhaka',
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
    status: 'PRESENT' as const,
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

  // Attendance Date Filter
  const [attDateFilter, setAttDateFilter] = useState(new Date().toISOString().split('T')[0]);

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
      employmentTypeId: emp.employmentTypeId,
      shiftId: emp.shiftId,
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

  // Manual Attendance Handler
  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === attForm.employeeId);
    if (!emp) return;

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
      notes: attForm.notes
    });
    setIsManualAttModalOpen(false);
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
    const matchSearch = e.name.toLowerCase().includes(empSearch.toLowerCase()) || 
      e.empCode.toLowerCase().includes(empSearch.toLowerCase()) || 
      e.designation.toLowerCase().includes(empSearch.toLowerCase()) ||
      e.phone.includes(empSearch);
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
                placeholder="Search employee by name, code (EMP-01), designation, phone..."
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
                    <th className="py-3.5 px-4">Shift</th>
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

          {/* Date Selector & Attendance Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-700">Select Attendance Date:</span>
                <input
                  type="date"
                  value={attDateFilter}
                  onChange={e => setAttDateFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-amber-500 cursor-pointer"
                />
              </div>

              <button
                onClick={() => setIsManualAttModalOpen(true)}
                className="px-3.5 py-1.5 bg-slate-900 text-amber-400 hover:bg-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Quick Clock In Entry
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Staff Name</th>
                    <th className="py-3 px-4">Shift</th>
                    <th className="py-3 px-4">Clock In</th>
                    <th className="py-3 px-4">Clock Out</th>
                    <th className="py-3 px-4">Total Hours</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No attendance records logged for {attDateFilter}. Click "Quick Clock In Entry" to log attendance.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map(att => (
                      <tr key={att.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-900">{att.employeeName}</td>
                        <td className="py-3 px-4 text-slate-600">{att.shift}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-emerald-700">{att.inTime}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{att.outTime || '--:--'}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{att.workingHours || 8} hrs</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            att.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                            att.status === 'LATE' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {att.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => deleteAttendanceRecord(att.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
                  onChange={e => setAttForm({ ...attForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-amber-500 cursor-pointer"
                  required
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.empCode} • {emp.designation})
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
                  onChange={e => setAttForm({ ...attForm, shift: e.target.value })}
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4">
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="Main Kitchen">Main Kitchen</option>
                    <option value="Floor Service">Floor Service</option>
                    <option value="Beverage Counter">Beverage Counter</option>
                    <option value="Billing Counter">Billing Counter</option>
                    <option value="Management">Management</option>
                  </select>
                </div>
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
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={empForm.status}
                    onChange={e => setEmpForm({ ...empForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500"
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
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#004b9b] text-white font-bold rounded-xl hover:bg-[#005bb8] shadow-md shadow-blue-900/20"
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
    </div>
  );
};
