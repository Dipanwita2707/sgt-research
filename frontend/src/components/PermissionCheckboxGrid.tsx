import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface Permission {
  key: string;
  label: string;
}

interface PermissionCategory {
  label: string;
  permissions: Permission[];
}

interface PermissionCategories {
  [key: string]: PermissionCategory;
}

interface PermissionCheckboxGridProps {
  userId: string;
  designation?: string;
  onSave?: (permissions: any) => void;
}

export default function PermissionCheckboxGrid({ userId, designation, onSave }: PermissionCheckboxGridProps) {
  const [categories, setCategories] = useState<PermissionCategories>({});
  const [selectedPermissions, setSelectedPermissions] = useState<{ [category: string]: string[] }>({});
  const [designationDefaults, setDesignationDefaults] = useState<{ [category: string]: string[] }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPermissions();
  }, [userId, designation]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      
      // Fetch permission categories
      const categoriesRes = await fetch('/api/designations/permissions/categories', {
        credentials: 'include'
      });
      const categoriesData = await categoriesRes.json();
      
      if (categoriesData.success) {
        setCategories(categoriesData.data);
      }

      // Fetch user permissions
      if (userId) {
        const userPermsRes = await fetch(`/api/designations/users/${userId}/permissions`, {
          credentials: 'include'
        });
        const userPermsData = await userPermsRes.json();
        
        if (userPermsData.success) {
          setSelectedPermissions(userPermsData.data.effectivePermissions || {});
          setDesignationDefaults(userPermsData.data.designationDefaults || {});
        }
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (categoryKey: string, permissionKey: string) => {
    setSelectedPermissions(prev => {
      const categoryPerms = prev[categoryKey] || [];
      const isSelected = categoryPerms.includes(permissionKey);
      
      return {
        ...prev,
        [categoryKey]: isSelected
          ? categoryPerms.filter(p => p !== permissionKey)
          : [...categoryPerms, permissionKey]
      };
    });
  };

  const isPermissionSelected = (categoryKey: string, permissionKey: string) => {
    return selectedPermissions[categoryKey]?.includes(permissionKey) || false;
  };

  const isFromDesignation = (categoryKey: string, permissionKey: string) => {
    return designationDefaults[categoryKey]?.includes(permissionKey) || false;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Save for each department that has permissions
      for (const [category, perms] of Object.entries(selectedPermissions)) {
        if (perms.length > 0) {
          await fetch(`/api/designations/users/${userId}/permissions`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              department: 'REGISTRAR', // You may need to map categories to departments
              permissions: selectedPermissions
            })
          });
        }
      }

      if (onSave) {
        onSave(selectedPermissions);
      }

      alert('Permissions saved successfully!');
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAll = (categoryKey: string) => {
    const allPerms = categories[categoryKey]?.permissions.map(p => p.key) || [];
    setSelectedPermissions(prev => ({
      ...prev,
      [categoryKey]: allPerms
    }));
  };

  const handleDeselectAll = (categoryKey: string) => {
    setSelectedPermissions(prev => ({
      ...prev,
      [categoryKey]: []
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Permission Management</h3>
          {designation && (
            <p className="text-sm text-gray-600 mt-1">
              Designation: <span className="font-medium">{designation}</span>
              <span className="ml-2 text-xs text-primary-600">(Auto-selected permissions shown in blue)</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>

      {/* Permission Categories Grid */}
      <div className="space-y-6">
        {Object.entries(categories).map(([categoryKey, category]) => (
          <div key={categoryKey} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">{category.label}</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSelectAll(categoryKey)}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => handleDeselectAll(categoryKey)}
                  className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {category.permissions.map(permission => {
                  const isSelected = isPermissionSelected(categoryKey, permission.key);
                  const isDefault = isFromDesignation(categoryKey, permission.key);
                  
                  return (
                    <label
                      key={permission.key}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                        ${isSelected 
                          ? isDefault
                            ? 'bg-primary-50 border-primary-300 hover:bg-primary-100'
                            : 'bg-green-50 border-green-300 hover:bg-green-100'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handlePermissionToggle(categoryKey, permission.key)}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {permission.label}
                          </span>
                          {isDefault && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                              Auto
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className={`w-4 h-4 flex-shrink-0 ${isDefault ? 'text-primary-600' : 'text-green-600'}`} />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              Total Selected: <span className="font-semibold text-gray-900">
                {Object.values(selectedPermissions).flat().length}
              </span> permissions
            </p>
            {designation && (
              <p className="text-xs text-gray-500 mt-1">
                From designation: {Object.values(designationDefaults).flat().length} | 
                Custom: {Object.values(selectedPermissions).flat().length - Object.values(designationDefaults).flat().length}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
