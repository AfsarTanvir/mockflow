'use client';

import { useState } from 'react';
import { useUser, useUpdateProfile, useResendVerification } from '@/query/auth';
import type { User } from '@/types';

export default function ProfileSettingsClient({ initialUser }: { initialUser: User }) {
  const { data: user } = useUser({ initialData: initialUser });

  const [name, setName] = useState(user?.name ?? '');
  const [nameDirty, setNameDirty] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const {
    mutate: resendVerify,
    isPending: resendingVerify,
    isSuccess: verifySent,
    error: verifyError,
  } = useResendVerification();

  const nameError = name.trim().length < 2 ? 'Name must be at least 2 characters' : null;
  const confirmError =
    confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : null;
  const newPwError = newPassword && newPassword.length < 8 ? 'Minimum 8 characters' : null;

  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nameError) return;
    updateProfile(
      { name: name.trim() },
      {
        onSuccess: () => {
          setNameDirty(false);
          setNameSuccess(true);
        },
        onError: () => setNameSuccess(false),
      }
    );
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword || !newPassword || confirmError || newPwError) return;
    updateProfile(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPwSuccess(true);
        },
        onError: () => setPwSuccess(false),
      }
    );
  }

  return (
    <main className="max-w-2xl mx-auto mt-8 px-6 pb-12 space-y-6">
      <h1 className="text-base font-semibold text-gray-900">Profile settings</h1>

      {/* Name */}
      <form onSubmit={handleNameSubmit} className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Display name</h2>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameDirty(true);
              setNameSuccess(false);
            }}
            maxLength={100}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {nameError && nameDirty && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{user?.email}</span>
          <div className="flex items-center gap-3">
            {nameSuccess && <span className="text-xs text-green-600">Saved.</span>}
            <button
              type="submit"
              disabled={isPending || !nameDirty || !!nameError}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? 'Saving…' : 'Save name'}
            </button>
          </div>
        </div>
      </form>

      {/* Email verification */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Email verification</h2>
          {user?.emailVerified ? (
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
              Verified
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">
              Not verified
            </span>
          )}
        </div>

        {user?.emailVerified ? (
          <p className="text-xs text-gray-500">
            Your email <span className="font-medium text-gray-700">{user.email}</span> is verified.
          </p>
        ) : (
          <>
            <p className="text-xs text-gray-500">
              Verify your email to confirm{' '}
              <span className="font-medium text-gray-700">{user?.email}</span>. Verification is
              optional — you can keep using MockFlow either way.
            </p>
            <div className="flex items-center justify-end gap-3">
              {verifySent && (
                <span className="text-xs text-green-600">
                  Verification email sent. Check your inbox.
                </span>
              )}
              {verifyError && (
                <span className="text-xs text-red-500">
                  {(verifyError as any)?.response?.data?.message ?? 'Failed to send'}
                </span>
              )}
              <button
                type="button"
                onClick={() => resendVerify()}
                disabled={resendingVerify}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {resendingVerify ? 'Sending…' : 'Send verification email'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Password */}
      <form onSubmit={handlePasswordSubmit} className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Change password</h2>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Current password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setPwSuccess(false);
            }}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setPwSuccess(false);
            }}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {newPwError && <p className="text-xs text-red-500 mt-1">{newPwError}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Confirm new password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setPwSuccess(false);
            }}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {confirmError && <p className="text-xs text-red-500 mt-1">{confirmError}</p>}
        </div>

        <div className="flex items-center justify-end gap-3">
          {pwSuccess && <span className="text-xs text-green-600">Password updated.</span>}
          <button
            type="submit"
            disabled={
              isPending || !currentPassword || !newPassword || !!confirmError || !!newPwError
            }
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? 'Saving…' : 'Update password'}
          </button>
        </div>
      </form>
    </main>
  );
}
