'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface AuthorizationPopupProps {
  isOpen: boolean;
  onAgree: () => void;
  onGoBack: () => void;
  schoolName?: string;
}

export default function AuthorizationPopup({
  isOpen,
  onAgree,
  onGoBack,
  schoolName = "BYU"
}: AuthorizationPopupProps) {
  const [showError, setShowError] = useState(false);

  if (!isOpen) return null;

  const handleProceed = () => {
    onAgree();
  };

  const handleGoBack = () => {
    setShowError(true);
    setTimeout(() => setShowError(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 font-work-sans">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4 flex items-center justify-center gap-3">
              Let stu
              <div className="rounded-lg p-2">
                <Image
                  src="/stu_icon_black.png"
                  alt="stu logo"
                  width={40}
                  height={40}
                />
              </div>
              access your {schoolName} account
            </h1>
          </div>

          {/* Authorization Text */}
          <div className="text-gray-700 text-lg leading-relaxed mb-8 space-y-4">
            <p>
              I hereby authorize STU LLC to access and use my academic records—including course history,
              degree progress, and other relevant educational data—for the purpose of providing personalized
              academic advising through this application.
            </p>

            <p>I understand that:</p>

            <ul className="list-disc pl-6 space-y-2">
              <li>
                My information will be securely stored and protected in accordance with applicable privacy
                laws, including FERPA.
              </li>
              <li>
                My data will be used exclusively for my benefit within the scope of academic advising and will
                not be shared with third parties without my explicit consent.
              </li>
              <li>
                I may withdraw this authorization at any time by contacting STU LLC through the support
                portal.
              </li>
            </ul>

            <p className="mt-6">
              By clicking "Agree," I acknowledge that I have read and understood this authorization and
              voluntarily give STU LLC permission to access and use my academic records as described.
            </p>
          </div>

          {/* Error Message */}
          {showError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-center font-medium">
                You must agree to the authorization before proceeding.
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={handleProceed}
              className="bg-primary hover:bg-primary/90 text-black font-bold text-xl px-12 py-4 rounded-lg w-full sm:w-auto order-2 sm:order-1"
            >
              Agree
            </Button>

            <Button
              onClick={handleGoBack}
              variant="outline"
              className="border-2 border-gray-300 text-black font-bold text-xl px-12 py-4 rounded-lg hover:bg-gray-50 w-full sm:w-auto order-1 sm:order-2"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}