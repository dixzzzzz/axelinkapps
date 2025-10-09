import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';

interface Voucher {
  id: string;
  username: string;
  password: string;
  profile: string;
  price: number;
  createdAt: string;
}

interface VoucherPrintData {
  vouchers: Voucher[];
  model: 'default' | 'model1' | 'model2';
  namaHotspot: string;
  adminKontak: string;
}

export default function VoucherPrint() {
  const [voucherData, setVoucherData] = useState<VoucherPrintData | null>(null);

  useEffect(() => {
    // Listen for messages from parent window
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PRINT_VOUCHERS') {
        setVoucherData(event.data.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    window.close();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const renderVoucherModel1 = (voucher: Voucher, index: number) => {
    const colors: Record<string, string> = {
      '5000': '#1433FD',
      '10000': '#663399',
      '20000': '#0000FF',
      '50000': '#FF8C00'
    };
    const color = colors[voucher.price.toString()] || '#FF69B4';

    return (
      <div
        key={voucher.id}
        className="voucher-model1"
        style={{
          border: `1px solid ${color}`,
          borderRadius: '5px',
          margin: '4px',
          padding: '5px',
          width: '220px',
          textAlign: 'center',
          fontFamily: 'Courier New, monospace',
          pageBreakInside: 'avoid',
          backgroundColor: '#fff'
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
          {voucherData?.namaHotspot}
        </div>
        <div style={{ fontSize: '12px', margin: '5px 0' }}>
          Paket {formatPrice(voucher.price)}
        </div>
        <div
          style={{
            border: `1px solid ${color}`,
            borderRadius: '5px',
            padding: '8px',
            margin: '5px 0',
            fontWeight: 'bold',
            fontSize: '16px'
          }}
        >
          {voucher.username}
        </div>
        <div style={{ fontSize: '10px' }}>Login: {voucher.username}</div>
        {voucher.username !== voucher.password && (
          <div style={{ fontSize: '10px' }}>Pass: {voucher.password}</div>
        )}
        <div style={{ fontSize: '10px', marginTop: '5px' }}>
          Kontak: {voucherData?.adminKontak}
        </div>
      </div>
    );
  };

  const renderVoucherModel2 = (voucher: Voucher, index: number) => {
    const color = '#bf0000';
    const formattedPrice = voucher.price.toLocaleString('id-ID');

    return (
      <div
        key={voucher.id}
        className="voucher-model2"
        style={{
          border: `1px solid ${color}`,
          borderRadius: '4px',
          textAlign: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          width: '245px',
          margin: '4px',
          pageBreakInside: 'avoid',
          backgroundColor: '#f2f2f2'
        }}
      >
        <div
          style={{
            backgroundColor: '#E6E6E6',
            border: `1px solid ${color}`,
            borderRadius: '4px',
            padding: '5px'
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
            {voucherData?.namaHotspot}
          </div>
        </div>
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '28px',
            color: '#555',
            marginTop: '5px'
          }}
        >
          <small style={{ fontSize: '18px' }}>Rp</small>
          {formattedPrice}
        </div>
        <div style={{ fontWeight: 'bold', color: '#555', fontSize: '13px' }}>
          Kode Voucher
        </div>
        <div
          style={{
            border: '1px solid #000',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '22px',
            color: '#FFF',
            backgroundColor: color,
            margin: '5px',
            padding: '5px'
          }}
        >
          {voucher.username}
        </div>
        <div style={{ fontSize: '10px' }}>Login dengan kode di atas</div>
        {voucher.username !== voucher.password && (
          <div style={{ fontSize: '10px' }}>Password: {voucher.password}</div>
        )}
        <div style={{ fontSize: '10px', marginTop: '5px' }}>
          {voucherData?.adminKontak}
        </div>
      </div>
    );
  };

  const renderVoucherDefault = (voucher: Voucher, index: number) => {
    return (
      <div key={voucher.id} className="voucher-default">
        <div className="voucher-header">{voucherData?.namaHotspot}</div>
        <div className="voucher-price">{formatPrice(voucher.price)}</div>
        <div className="voucher-login-info">
          <div>Login: @hotspot</div>
          <div className="voucher-credentials">
            <div className="voucher-username">{voucher.username}</div>
            {voucher.username !== voucher.password && (
              <div className="voucher-password">Pass: {voucher.password}</div>
            )}
          </div>
        </div>
        <div className="voucher-footer">Hubungi: {voucherData?.adminKontak}</div>
      </div>
    );
  };

  const renderVouchers = () => {
    if (!voucherData) return null;

    const { vouchers, model } = voucherData;

    return vouchers.map((voucher, index) => {
      switch (model) {
        case 'model1':
          return renderVoucherModel1(voucher, index);
        case 'model2':
          return renderVoucherModel2(voucher, index);
        default:
          return renderVoucherDefault(voucher, index);
      }
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Print Controls - Hidden when printing */}
      <div className="no-print p-4 bg-gray-100 border-b flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={handleBack} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-lg font-semibold">Voucher Print Preview</h1>
        </div>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Print Vouchers
        </Button>
      </div>

      {/* Voucher Container */}
      <div className="voucher-container p-4">
        {voucherData ? (
          renderVouchers()
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Waiting for voucher data...</p>
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0;
            padding: 0;
          }
          
          .voucher-container {
            page-break-after: always;
            page-break-inside: avoid;
          }
          
          .page-break {
            page-break-after: always;
            break-after: page;
          }
        }

        @page {
          size: A4;
          margin: 0.5cm;
        }

        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          width: 21cm;
          min-height: 29.7cm;
          box-sizing: border-box;
        }

        .voucher-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5cm;
          width: 100%;
        }

        .voucher-default {
          width: 100%;
          border: 1px solid #ccc;
          border-radius: 10px;
          padding: 10px;
          box-sizing: border-box;
          break-inside: avoid;
          page-break-inside: avoid;
          background-color: #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .voucher-header {
          font-weight: bold;
          font-size: 0.9em;
          color: #fff;
          background-color: #007bff;
          padding: 8px;
          border-radius: 5px 5px 0 0;
          margin: -10px -10px 10px -10px;
        }

        .voucher-price {
          font-size: 1em;
          font-weight: bold;
          margin: 5px 0;
          color: #333;
        }

        .voucher-login-info {
          margin: 8px 0;
          font-size: 0.8em;
        }

        .voucher-credentials {
          border: 1px dashed #666;
          padding: 5px;
          margin: 8px 0;
          background-color: #f9f9f9;
          border-radius: 4px;
        }

        .voucher-username {
          font-size: 1.1em;
          font-weight: bold;
          word-break: break-all;
        }

        .voucher-password {
          font-size: 0.9em;
          color: #555;
          word-break: break-all;
        }

        .voucher-footer {
          font-size: 0.8em;
          margin-top: 8px;
          color: #666;
          border-top: 1px solid #eee;
          padding-top: 5px;
        }
      `}</style>
    </div>
  );
}