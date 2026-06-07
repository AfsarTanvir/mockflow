'use client';

import { useState } from 'react';
import { useUser, useUpdateProfile, useUploadAvatar, useResendVerification } from '@/query/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AvatarUploader } from '@/components/dashboard/avatar-uploader';
import type { User } from '@/types';

/**
 * Account (user) settings — name, password, account avatar, email verification.
 * Company-scoped profile editing lives at /company/[slug]/profile.
 */
export default function AccountClient({ initialUser }: { initialUser: User }) {
  const { data: user } = useUser({ initialData: initialUser });

  const [name, setName] = useState(user?.name ?? '');
  const [nameDirty, setNameDirty] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const { mutate: uploadAvatar, isPending: uploadingAvatar } = useUploadAvatar();
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
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-foreground text-base font-semibold">Account</h1>

      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarUploader
            currentUrl={user?.avatarUrl ?? null}
            name={user?.name ?? ''}
            isPending={uploadingAvatar || isPending}
            onUploadFile={(file) => uploadAvatar(file)}
            onSetUrl={(url) => updateProfile({ avatarUrl: url })}
            onRemove={() => updateProfile({ avatarUrl: null })}
          />
        </CardContent>
      </Card>

      {/* Name */}
      <Card>
        <CardHeader>
          <CardTitle>Display name</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameDirty(true);
                  setNameSuccess(false);
                }}
                maxLength={100}
                aria-invalid={!!nameError && nameDirty}
              />
              {nameError && nameDirty && <p className="text-destructive text-xs">{nameError}</p>}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">{user?.email}</span>
              <div className="flex items-center gap-3">
                {nameSuccess && <span className="text-success text-xs">Saved.</span>}
                <Button type="submit" disabled={isPending || !nameDirty || !!nameError}>
                  {isPending ? 'Saving…' : 'Save name'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Email verification */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Email verification</CardTitle>
          {user?.emailVerified ? (
            <Badge variant="success">Verified</Badge>
          ) : (
            <Badge variant="warning">Not verified</Badge>
          )}
        </CardHeader>
        <CardContent>
          {user?.emailVerified ? (
            <p className="text-muted-foreground text-xs">
              Your email <span className="text-foreground font-medium">{user.email}</span> is
              verified.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground text-xs">
                Verify your email to confirm{' '}
                <span className="text-foreground font-medium">{user?.email}</span>. Verification is
                optional — you can keep using MockFlow either way.
              </p>
              <div className="flex items-center justify-end gap-3">
                {verifySent && (
                  <span className="text-success text-xs">
                    Verification email sent. Check your inbox.
                  </span>
                )}
                {verifyError && (
                  <span className="text-destructive text-xs">
                    {(verifyError as Error)?.message ?? 'Failed to send'}
                  </span>
                )}
                <Button type="button" onClick={() => resendVerify()} disabled={resendingVerify}>
                  {resendingVerify ? 'Sending…' : 'Send verification email'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPwSuccess(false);
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPwSuccess(false);
                }}
                aria-invalid={!!newPwError}
              />
              {newPwError && <p className="text-destructive text-xs">{newPwError}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPwSuccess(false);
                }}
                aria-invalid={!!confirmError}
              />
              {confirmError && <p className="text-destructive text-xs">{confirmError}</p>}
            </div>

            <div className="flex items-center justify-end gap-3">
              {pwSuccess && <span className="text-success text-xs">Password updated.</span>}
              <Button
                type="submit"
                disabled={
                  isPending || !currentPassword || !newPassword || !!confirmError || !!newPwError
                }
              >
                {isPending ? 'Saving…' : 'Update password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
