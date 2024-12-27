"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import GetMe from "@/app/helpers/getme"; // Adjust the path if necessary

const TermsPage = () => {
    const user = GetMe(); // Fetch user data using GetMe
    const [isMobile, setIsMobile] = useState(false); // Define isMobile state

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        handleResize(); // Check on initial render

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return (
        <div className="flex flex-col items-center w-full max-w-screen-xl mx-auto space-y-6 font-montserrat">
            {/* Terms and Conditions Section */}
            <div className="w-full max-w-5xl bg-transparent  p-6">
                <h1
                    className="text-3xl font-semibold mb-6 text-center"
                    style={{
                        color: "#face39",
                        fontSize: isMobile ? "1.5rem" : "2rem",
                    }}
                >
                    Mock Test Terms and Conditions
                </h1>
                <div className="space-y-5">
                    <ol className="list-decimal list-inside">
                        <li className="mb-4">
                            <strong>Mock Test Purchase:</strong> All mock tests must be
                            pre-purchased and fully paid before booking. No due payments will
                            be accepted at the time of booking or on the test date.
                        </li>
                        <li className="mb-4">
                            <strong>Booking Timeline:</strong> Mock tests must be booked <span className="font-semibold">at
                            least 24 hours in advance</span>, depending on availability for the
                            desired date.
                        </li>
                        <li className="mb-4">
                            <strong>Valid ID Requirements:</strong> Candidates must present a
                            valid <span className="font-semibold">NID or Passport</span> on the test day. A clear image of the ID
                            document is acceptable if the physical copy is unavailable.
                        </li>
                        <li className="mb-4">
                            <strong>Accurate Information:</strong> Candidate details, including <span className="font-semibold">Name, Money Receipt Number, and NID/Passport Information</span>, must be valid and match exactly with the information provided at the time of booking. Any mismatch may result in the candidate being unable to take the test.
                        </li>
                        <li className="mb-4">
                            <strong>Cancellation and Rescheduling:</strong> <br />
                            <ul className="list-disc list-inside ml-6">
                                <li className="mb-4">
                                    <strong>Cancellation Policy:</strong>  Booked mock tests <span className="font-semibold">cannot be canceled.</span>

                                   
                                </li>
                                <li className="mb-4">
                                    <strong>Rescheduling Policy:</strong> 
                                    <ul className="list-disc list-inside ml-6">
                                <li className="mb-4">
                                    Rescheduling requests must be made <span className="font-semibold">at least 24 hours before the booked test date</span>.
                                </li>
                                <li className="mb-4">
                                    Rescheduling depends on the availability of new test dates.
                                </li>
                                <li className="mb-4">
                                    If the desired test date is unavailable, Luminedge is not liable, and <span className="font-semibold">no refunds</span> will be issued.

                                </li>
                                <li className="mb-4">
                                    Rescheduling is not allowed within 24 hours of the test date.
                                </li>
                            </ul>
                                </li>
                            </ul>
                        </li>
                        <li className="mb-4">
                            <strong>No-Show Policy:</strong> Failing to appear for the test on
                            the scheduled date and time will be considered a <span className="font-semibold">no-show,</span> and the
                            mock test will be treated as taken. No refunds or rescheduling
                            options will be provided in such cases.
                        </li>
                        <li className="mb-4">
                            <strong>Punctuality:</strong> Candidates must report to the
                            Luminedge office <span className="font-semibold">at least 30 minutes before the scheduled test
                            time</span>. Late arrivals may result in automatic cancellation of the
                            mock test. No refunds or rescheduling options will be provided in
                            such cases.
                        </li>
                        <li className="mb-4">
                            <strong>Mock Test Process:</strong>
                            <ul className="list-disc list-inside ml-6">
                            <li className="mb-4">
                            Candidates must follow all instructions provided by the invigilator during the test.
                            </li>
                            <li className="mb-4">
                            Disruptive or inappropriate behavior may lead to disqualification from the mock test without any refund.
                            </li>
                            </ul>
                        </li>
                        <li className="mb-4">
                            <strong>Confidentiality:</strong> Mock test content and questions
                            are proprietary and must not be shared, copied, or reproduced in
                            any form.
                        </li>
                        <li className="mb-4">
                            <strong>Mock Test Format and Rules:</strong> 
                            <ul className="list-disc list-inside ml-6">
                                <li>
                                Mock tests are
                                designed to simulate actual test conditions and formats.
                                </li>
                                <li>
                                Candidates must bring their own stationery or necessary items if
                                required (e.g., pencils, sharpener, eraser).
                                </li>
                            </ul>
                            

                           
                        </li>
                        <li className="mb-4">
                            <strong>Technical Issues:</strong> In case of technical or system
                            errors, Luminedge will make every effort to resolve the issue.
                            However, Luminedge is not liable for external disruptions like
                            internet outages or power failures.
                        </li>
                        <li className="mb-4">
                            <strong>Emergency Situations:</strong> In case of emergencies,
                            candidates must inform Luminedge immediately using the provided
                            contact details.
                        </li>
                    </ol>
                    <p>
                        By booking a mock test, candidates agree to adhere to all terms and
                        conditions mentioned above. Any violation of these terms may result
                        in cancellation or forfeiture of the mock test without a refund.
                    </p>
                </div>
            </div>
           
           {/* Emergency Contact Information */}         
     <div className="w-full max-w-5xl bg-transparent  p-2">
        <h1 className="text-xl font-semibold text-center" style={{ color: "#face39" }}>
          {isMobile ? "Emergency Contact Info" : "Emergency Contact Information:"}
        </h1>
        <p className="text-center mt-1 mb-4">
          In case of any emergency or if you need to communicate with us regarding your mock test, please contact:
        </p>
        {/* Contact Info Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          <div className="p-4 border rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-2">Address</h2>
            <p>
              Level 12, Gawsia Twin Peak, 743 Satmasjid Road, Dhanmondi, Dhaka,
              Bangladesh, 1205
            </p>
          </div>

          <div className="p-4 border rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-2">Telephone</h2>
              <p>01400-403474</p>
              <p>01400-403475</p>
              <p>01400-403486</p>
              <p>01400-403487</p>
              <p> 01400-403493</p>
              <p>01400-403494</p>
            </div>

          <div className="p-4 border rounded-lg shadow-md">
            
          <h2 className="text-lg font-semibold mb-2">E-mail</h2>
              <p className="break-words">ielts.luminedge@gmail.com</p>
          </div>
        </div>
      </div>
        </div>
    );
};

export default TermsPage;
