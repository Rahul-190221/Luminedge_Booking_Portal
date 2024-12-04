import React from "react";

const TermsAndConditions = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full bg-white shadow-lg rounded-lg p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          Luminedge Policies
        </h1>

        <section id="terms-conditions" className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Terms and Conditions
          </h2>
          <p className="text-gray-700 mb-4">
            Welcome to Luminedge Bangladesh! These Terms and Conditions
            (“Terms”) govern your use of our services provided through our
            website Luminedge Bangladesh. By using our services, you agree to
            comply with these Terms. If you disagree with any part of these
            Terms, please do not use our services.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Definitions
          </h3>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li>
              <strong>“We”, “Us”, “Our”:</strong> Refers to Luminedge Bangladesh
              (Luminedge Limited), a limited liability company registered in
              Bangladesh.
            </li>
            <li>
              <strong>“You”, “Your”:</strong> Refers to the user or customer of
              our services.
            </li>
            <li>
              <strong>“Services”:</strong> Refers to study abroad consultancy
              and English language proficiency training provided by Luminedge
              Bangladesh.
            </li>
            <li>
              <strong>“Website”:</strong> Refers to{" "}
              <a
                href="https://luminedge.com.bd"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://luminedge.com.bd
              </a>
              .
            </li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Services Provided
          </h3>
          <p className="text-gray-700 mb-4">We offer the following services:</p>
          <ul className="list-decimal pl-6 text-gray-700 mb-4">
            <li>
              <strong>Study Abroad Consultancy:</strong> Personalized
              consultancy for students seeking to study abroad, including
              guidance on university selection, application processes, and visa
              procedures.
            </li>
            <li>
              <strong>English Language Proficiency Training:</strong> Training
              programs to improve your English language skills, including
              preparation for tests such as IELTS and TOEFL.
            </li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Registration and Accounts
          </h3>
          <p className="text-gray-700 mb-4">
            You must provide accurate information when creating an account. You
            agree not to share your account details and to safeguard your
            account information.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Personal Information
          </h3>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li>
              <strong>Information We Collect:</strong> Email address, first
              name, last name, and phone number.
            </li>
            <li>
              <strong>Use of Information:</strong> We use your information to
              improve services and communicate with you, without sharing it with
              third parties except as required by law.
            </li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Payment Terms
          </h3>
          <p className="text-gray-700 mb-4">
            Payments are made at our official location. Fees and applicable
            taxes will be communicated directly to you.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Contact Information
          </h3>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li>
              <strong>Email:</strong>{" "}
              <a
                href="mailto:info.dhaka@luminedge.com.au"
                className="text-blue-600 hover:underline"
              >
                info.dhaka@luminedge.com.au
              </a>
            </li>
            <li>
              <strong>Phone:</strong> +88 01400 403474
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default TermsAndConditions;
