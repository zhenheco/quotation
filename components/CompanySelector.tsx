'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Company {
  id: string;
  name: {
    zh: string;
    en: string;
  };
  logo_url?: string | null;
}

interface CompanySelectorProps {
  locale: string;
}

function getImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.startsWith('/api/')) return url;
  if (url.includes('supabase.co/storage')) {
    const match = url.match(/company-files\/(.+)$/);
    if (match) {
      return `/api/storage/company-files?path=${encodeURIComponent(match[1])}`;
    }
  }
  return url;
}

export default function CompanySelector({ locale }: CompanySelectorProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
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
        const data = await response.json() as Company[];
        setCompanies(data);

        // Get selected company from localStorage or use first company
        const storedCompanyId = localStorage.getItem('selectedCompanyId');
        const isValidCompanyId = storedCompanyId && data.find((c) => c.id === storedCompanyId);

        if (isValidCompanyId) {
          setSelectedCompanyId(storedCompanyId);
        } else if (data.length > 0) {
          // Clear invalid stored company ID
          if (storedCompanyId) {
            localStorage.removeItem('selectedCompanyId');
          }
          setSelectedCompanyId(data[0].id);
          localStorage.setItem('selectedCompanyId', data[0].id);
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

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

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
        className="appearance-none flex items-center gap-2 pl-10 pr-8 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0 max-w-[180px] sm:max-w-none text-sm sm:text-base truncate"
      >
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {locale === 'zh' ? (company.name?.zh || '') : (company.name?.en || '')}
          </option>
        ))}
      </select>

      {/* Company logo or icon */}
      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
        {getImageUrl(selectedCompany?.logo_url) ? (
          <Image
            src={getImageUrl(selectedCompany?.logo_url)!}
            alt="Company logo"
            width={24}
            height={24}
            className="rounded-full object-cover"
            unoptimized
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-xs font-semibold text-blue-600">
              {selectedCompany?.name?.zh?.charAt(0) || 'C'}
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
