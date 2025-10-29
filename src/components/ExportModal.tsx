import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storage';
import { 
  exportToCSV, 
  exportToExcel, 
  exportToPDF, 
  prepareExportData, 
  getDefaultFilters, 
  getAvailableCategories,
  ExportFilters 
} from '../utils/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { expenses, groups, friends } = useApp();
  const [filters, setFilters] = useState<ExportFilters>(getDefaultFilters());
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'excel' | 'pdf'>('pdf');

  // Get all users that are relevant to the current user (self + friends + group members)
  const allStorageUsers = storageService.getUsers();
  const relevantUsers = React.useMemo(() => {
    const userIds = new Set<string>();
    
    // Add current user
    if (user) {
      userIds.add(user.id);
    }
    
    // Add friends
    friends.forEach(friend => {
      userIds.add(friend.id);
    });
    
    // Add group members
    groups.forEach(group => {
      group.members.forEach(member => {
        userIds.add(member.userId);
      });
    });
    
    // Add users from expenses (to catch any edge cases)
    expenses.forEach(expense => {
      userIds.add(expense.paidBy);
      expense.splits.forEach(split => {
        userIds.add(split.userId);
      });
    });
    
    return allStorageUsers.filter(u => userIds.has(u.id));
  }, [user, friends, groups, expenses, allStorageUsers]);

  const availableCategories = getAvailableCategories(expenses);

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    if (!user) return;

    setIsExporting(true);
    try {
      const exportData = prepareExportData(expenses, user, filters, relevantUsers);
      
      switch (format) {
        case 'csv':
          exportToCSV(exportData, relevantUsers, groups);
          break;
        case 'excel':
          exportToExcel(exportData, relevantUsers, groups);
          break;
        case 'pdf':
          exportToPDF(exportData, relevantUsers, groups);
          break;
      }

      // Close modal after successful export
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCategoryToggle = (category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const resetFilters = () => {
    setFilters(getDefaultFilters());
  };

  const previewData = user ? prepareExportData(expenses, user, filters, relevantUsers) : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Export Your Expenses</CardTitle>
            <Button variant="outline" onClick={onClose}>
              ✕
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Export Format Selection */}
            <div>
              <h3 className="font-semibold mb-3">Export Format</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: 'pdf', label: 'PDF Report', description: 'Formatted report with summary' },
                  { key: 'excel', label: 'Excel Spreadsheet', description: 'Detailed data with multiple sheets' },
                  { key: 'csv', label: 'CSV File', description: 'Simple data for other apps' }
                ].map(format => (
                  <div
                    key={format.key}
                    onClick={() => setSelectedFormat(format.key as any)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedFormat === format.key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">{format.label}</div>
                    <div className="text-sm text-gray-600 mt-1">{format.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Date Range */}
              <div>
                <h3 className="font-semibold mb-3">Date Range</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={filters.dateRange.start ? filters.dateRange.start.toISOString().split('T')[0] : ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: {
                          ...prev.dateRange,
                          start: e.target.value ? new Date(e.target.value) : null
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={filters.dateRange.end ? filters.dateRange.end.toISOString().split('T')[0] : ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: {
                          ...prev.dateRange,
                          end: e.target.value ? new Date(e.target.value) : null
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>

              {/* Amount Range */}
              <div>
                <h3 className="font-semibold mb-3">Amount Range (Your Share)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Amount
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={filters.minAmount || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        minAmount: e.target.value ? parseFloat(e.target.value) : null
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Amount
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="No limit"
                      value={filters.maxAmount || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        maxAmount: e.target.value ? parseFloat(e.target.value) : null
                      }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div>
              <h3 className="font-semibold mb-3">Categories</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {availableCategories.map(category => (
                  <label key={category} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.categories.length === 0 || filters.categories.includes(category)}
                      onChange={() => handleCategoryToggle(category)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm capitalize">{category}</span>
                  </label>
                ))}
              </div>
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters(prev => ({ ...prev, categories: [] }))}
                >
                  Select All
                </Button>
              </div>
            </div>

            {/* Expense Types */}
            <div>
              <h3 className="font-semibold mb-3">Expense Types</h3>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.includePersonal}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      includePersonal: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Personal expenses (with friends)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.includeGroups}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      includeGroups: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Group expenses</span>
                </label>
              </div>
            </div>

            {/* Preview */}
            {previewData && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Preview</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Expenses:</span>
                    <div className="font-medium">{previewData.totalCount}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Amount:</span>
                    <div className="font-medium">${previewData.totalAmount.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Average:</span>
                    <div className="font-medium">
                      ${previewData.totalCount > 0 ? (previewData.totalAmount / previewData.totalCount).toFixed(2) : '0.00'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={resetFilters}
              >
                Reset Filters
              </Button>
              
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleExport(selectedFormat)}
                  disabled={isExporting || !previewData || previewData.totalCount === 0}
                >
                  {isExporting ? 'Exporting...' : `Export ${selectedFormat.toUpperCase()}`}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExportModal;