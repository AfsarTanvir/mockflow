import { Suspense } from 'react';
import VerifyPendingForm from './VerifyPendingForm';

export default function VerifyPendingPage() {
  return (
    <Suspense>
      <VerifyPendingForm />
    </Suspense>
  );
}
