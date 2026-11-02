"use client";

// Static confirmation/policy screen reached from the student booking table.
// FIX-02c: this page must not offer a student reschedule action. The previous
// implementation kept a "Reschedule" button wired to a booking DELETE plus a
// "book replacement" flow, which could cancel a booking without rebooking it.
const CoursesPage = () => {
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  return (
    <div className="flex flex-col items-center w-full max-w-screen-xl mx-auto space-y-4 px-2 sm:px-4 md:px-8">
      {/* Test Details */}
      <div className="w-full max-w-5xl bg-transparent p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl text-[#FACE39] text-center mb-4 sm:mb-6">
          Thank you for booking your mock test with Luminedge!
        </h1>
        {/* Your Mock Test Details */}
        <h2 className="text-xl sm:text-2xl font-semibold mb-2">Your Mock Test Details</h2>
        
        <ul className="list-disc list-inside ml-4 sm:ml-6">
          <li className="mb-2 sm:mb-4">
            <strong>Test Date and Time:</strong> Check the exact schedule of your mock test from the <span>&nbsp;</span>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/dashboard" className="text-[#FACE39] underline text-lg">Dashboard</a>.
          </li>
          <li className="mb-2 sm:mb-4"><strong>Venue Information:</strong> Check the venue listed in your booking details on the Dashboard.</li>
          <li className="mb-2 sm:mb-4"><strong>Required Documents:</strong> Ensure you have the correct identification (NID/ Passport) ready for test day.</li>
        </ul>
      
        <div className="text-left mt-4 sm:mt-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-4">Important Guidelines for Test Day</h2>
          <p className="mb-2 sm:mb-4">
            To ensure everything goes as planned, please follow these essential rules:
          </p>
          <ol className="list-decimal list-inside ml-4 sm:ml-6 space-y-2 sm:space-y-4">
            <li>
              <strong>Mandatory ID Presentation:</strong>
              <ul className="list-disc list-inside ml-4 sm:ml-6 mt-1 sm:mt-2">
                <li>
                  Bring a valid <span className="font-semibold">NID</span> or <span className="font-semibold">Passport</span> on the test day. Printed or digital photo of the document is acceptable.
                </li>
                <li>
                  The details on your ID must match the information provided during your mock test booking. Mismatched details may result in cancellation, and you will not be allowed to take the test.
                </li>
              </ul>
            </li>
            <li>
              <strong>Reporting Time:</strong>
              <ul className="list-disc list-inside ml-4 sm:ml-6 mt-1 sm:mt-2">
                <li>
                  Arrive at the venue listed in your booking details at least 30 minutes before your scheduled mock test.
                </li>
                <li>
                  Being late or failing to appear will be treated as if the test has already been taken, and no refunds or rescheduling will be allowed.
                </li>
              </ul>
            </li>
          </ol>
        </div>
     {/* Mock Test Rescheduling Policy */}
<div className="text-left mt-4 sm:mt-6">
  <h2 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-4">
    Mock Test Rescheduling Policy
  </h2>
  <p>If you need to reschedule your mock test, please note the following:</p>
  <ul className="list-disc list-inside ml-4 sm:ml-6">
    <li className="mb-2">
      You can reschedule your test up to <span className="font-semibold">24 hours before the scheduled date</span>, depending on the availability of your preferred new date.
    </li>
    <li className="mb-2">
      If your desired date is unavailable at the time of rescheduling, Luminedge will not be held responsible, and <span className="font-semibold">no refund requests will be entertained.</span>
    </li>
    <li className="mb-2">
      <span className="font-semibold">Rescheduling is not allowed within 24 hours of the test date.</span>
    </li>
    <li className="mb-2">
      If you fail to attend your test on the scheduled date, it will be considered as taken, and no rescheduling or refunds will be possible.
    </li>
  </ul>
  <div className="flex justify-center mt-4 sm:mt-6">
    <p className="text-center font-semibold">
      To reschedule, please contact the front desk at least 24 hours before your test.
    </p>
  </div>
</div>
        {/* Key Reminders */}
        <div className="w-full max-w-5xl bg-transparent p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-4">Key Reminders</h2>
          <ul className="list-disc list-inside ml-4 sm:ml-6 space-y-2 sm:space-y-4">
            <li>Make sure the details you provided during booking (name, ID, etc.) match exactly with your identification documents.</li>
            <li>Arrive on time to avoid any issues. Failure to comply with the rules may result in automatic cancellation of your mock test.</li>
            <li>We&apos;re excited to be a part of your test preparation and are here to support you every step of the way. If you have any questions or need assistance, feel free to contact our support team or visit the Luminedge office. Good luck with your mock test! Thank you once again for choosing Luminedge to help you achieve your goals.</li>
          </ul>
        </div>
        <p><strong>Good luck with your mock test! Thank you once again for choosing Luminedge to help you achieve your goals.</strong></p>
        {/* Emergency Contact Information */}
        <div className="w-full max-w-5xl bg-transparent p-4 sm:p-6">
          <h1 className="text-lg sm:text-xl font-semibold text-center text-brand-yellow">
            {isMobile ? "Emergency Contact Info" : "Emergency Contact Information:"}
          </h1>
          <p className="text-center mt-1 mb-2 sm:mb-4">
            In case of any emergency or if you need to communicate with us regarding your mock test, please contact:
          </p>
          {/* Contact Info Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
            <div className="p-4 border rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-2">Address</h2>
              <p>
                42 Satmasjid Road, Dhanmondi
              </p>
            </div>

            <div className="p-4 border rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-2">Telephone</h2>
              <p>01400-403485</p>
              <p>01400-403474</p>
              <p>01400-403475</p>
              <p>01400-403486</p>
              <p>01400-403487</p>
              <p> 01400-403493</p>
              <p>01400-403494</p>
            </div>

            <div className="p-4 border rounded-lg shadow-md">
                <p className="break-words">ielts.luminedge@gmail.com</p>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoursesPage;
