// @ts-nocheck
import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { buildFileUrl } from '@/utils/fileHelpers';

interface MembershipCardProps {
  fullName: string;
  membershipId: string;
  status: string;
  activeMonth?: number | null;
  activeYear?: number | null;
  profileImageUrl?: string | null;
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const VirtualMembershipCard: React.FC<MembershipCardProps> = ({
  fullName,
  membershipId,
  status,
  activeMonth,
  activeYear,
  profileImageUrl
}) => {
  const isActive = status === 'active';
  const memberInitial = fullName.charAt(0).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative w-full max-w-lg mx-auto"
      data-testid="virtual-membership-card"
    >
      <div
        className="relative bg-[#0F0F12] rounded-sm overflow-hidden aspect-[16/10]"
        style={{
          border: isActive ? '3px solid #FF5722' : '2px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Basketball texture background - diagonal split */}
        <div className="absolute inset-0 flex">
          {/* Left side - dark */}
          <div className="w-[45%] bg-[#0A0A0D]" />
          
          {/* Right side - basketball texture */}
          <div 
            className="flex-1 bg-cover bg-center"
            style={{
              backgroundImage: 'url(https://images.pexels.com/photos/1752757/pexels-photo-1752757.jpeg?auto=compress&cs=tinysrgb&w=1200)',
              backgroundPosition: 'center',
              backgroundSize: 'cover'
            }}
          >
            <div className="absolute inset-0 bg-black/40" />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <img 
                src="https://customer-assets.emergentagent.com/job_7e826d1b-3298-4572-a3f0-5a19712b664b/artifacts/p0rqi0r7_logo-lxb%20%281%29.jpg"
                alt="LXB Logo"
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
              />
            </div>
            
            {/* Member number */}
            <div className="text-white text-xs sm:text-sm font-mono tracking-wider">
              :{membershipId.split('-').pop()}
            </div>
          </div>

          {/* Center section - Photo and Name */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Photo */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-sm overflow-hidden border-2 border-white/20 mb-2 sm:mb-3">
              {profileImageUrl ? (
                <img 
                  src={buildFileUrl(profileImageUrl)}
                  alt={fullName} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement.innerHTML = `<div class="w-full h-full bg-[#FF5722] flex items-center justify-center"><span class="text-white text-3xl sm:text-4xl font-black bebas">${memberInitial}</span></div>`;
                  }}
                />
              ) : (
                <div className="w-full h-full bg-[#FF5722] flex items-center justify-center">
                  <span className="text-white text-3xl sm:text-4xl font-black bebas">{memberInitial}</span>
                </div>
              )}
            </div>

            {/* Name */}
            <div className="text-white text-center mb-2">
              <div className="text-xl sm:text-2xl font-black bebas uppercase tracking-tight">
                {fullName}
              </div>
            </div>

            {/* League name - centered and visible */}
            <div className="text-white text-center px-2">
              <div className="text-[10px] sm:text-xs uppercase tracking-[0.15em] leading-snug font-bold">
                <div className="hidden sm:block">LEAGUE OF XTRAORDINARY BALLERS</div>
                <div className="sm:hidden">
                  <div>LEAGUE OF</div>
                  <div>XTRAORDINARY BALLERS</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-end justify-between mt-2">
            {/* Status indicator */}
            <div className="flex flex-col gap-1">
              {isActive ? (
                <div className="flex items-center gap-1 bg-[#4CAF50] px-2 py-0.5 rounded-sm">
                  <Check size={10} className="text-white sm:w-3 sm:h-3" />
                  <span className="text-white text-[9px] sm:text-[10px] font-bold uppercase">Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-[#F44336] px-2 py-0.5 rounded-sm">
                  <X size={10} className="text-white sm:w-3 sm:h-3" />
                  <span className="text-white text-[9px] sm:text-[10px] font-bold uppercase">Inactive</span>
                </div>
              )}
            </div>

            {/* Large initial */}
            <div className="text-[#FF5722] text-5xl sm:text-6xl font-black bebas leading-none">
              {memberInitial}
            </div>
          </div>
        </div>

        {/* Active glow effect */}
        {isActive && (
          <div className="absolute inset-0 pointer-events-none" style={{
            boxShadow: 'inset 0 0 40px rgba(255, 87, 34, 0.3)'
          }} />
        )}
      </div>

      {/* Card info below */}
      {isActive && activeMonth && activeYear && (
        <div className="mt-3 text-center text-sm text-[#4CAF50] font-medium">
          Valid for: {monthNames[activeMonth - 1]} {activeYear}
        </div>
      )}
    </motion.div>
  );
};

export default VirtualMembershipCard;
