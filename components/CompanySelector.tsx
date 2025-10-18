'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserCompany {
  company_id: string;
  company_name: {
    zh: string;
    en: string;
  };
  role_name: string;
  is_owner: boolean;
  logo_url?: string;
}

interface CompanySelectorProps {
  locale: string;
}

export default function CompanySelector({ locale }: CompanySelectorProps) {
  const [companies, setCompanies] = useState<UserCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);

        // Get selected company from localStorage or use first company
        const storedCompanyId = localStorage.getItem('selectedCompanyId');
        if (storedCompanyId && data.find((c: UserCompany) => c.company_id === storedCompanyId)) {
          setSelectedCompanyId(storedCompanyId);
        } else if (data.length > 0) {
          setSelectedCompanyId(data[0].company_id);
          localStorage.setItem('selectedCompanyId', data[0].company_id);
        }
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    localStorage.setItem('selectedCompanyId', companyId);
    // Refresh the page to update data for the new company
    router.refresh();
  };

  const selectedCompany = companies.find(c => c.company_id === selectedCompanyId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg animate-pulse">
        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
        <div className="w-24 h-4 bg-gray-300 rounded"></div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <button
        onClick={() => router.push(`/${locale}/settings`)}
        className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
      >
        <span className="text-xl">+</span>
        <span className="text-sm font-medium">
          {locale === 'zh' ? '創建公司' : 'Create Company'}
        </span>
      </button>
    );
  }

  return (
    <div className="relative">
      <select
        value={selectedCompanyId || ''}
        onChange={(e) => handleCompanyChange(e.target.value)}
        className="appearance-none flex items-center gap-2 pl-10 pr-8 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {companies.map((company) => (
          <option key={company.company_id} value={company.company_id}>
            {locale === 'zh' ? company.company_name.zh : company.company_name.en}
            {company.is_owner && ` (${locale === 'zh' ? '擁有者' : 'Owner'})`}
          </option>
        ))}
      </select>

      {/* Company logo or icon */}
      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
        {selectedCompany?.logo_url ? (
          <img
            src={selectedCompany.logo_url}
            alt="Company logo"
            className="w-6 h-6 rounded-full object-cover"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-xs font-semibold text-blue-600">
              {selectedCompany?.company_name.zh.charAt(0) || 'C'}
            </span>
          </div>
        )}
      </div>

      {/* Dropdown arrow */}
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}
