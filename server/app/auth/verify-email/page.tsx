export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <svg 
            className="mx-auto h-12 w-12 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
            />
          </svg>
          
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Check your email
          </h2>
          
          <p className="mt-2 text-center text-sm text-gray-600">
            We've sent you a verification link to your email address.
          </p>
          
          <p className="mt-4 text-center text-sm text-gray-600">
            Please click the link in the email to verify your account and get started.
          </p>
          
          <div className="mt-8">
            <a 
              href="/auth/login" 
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Back to login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}