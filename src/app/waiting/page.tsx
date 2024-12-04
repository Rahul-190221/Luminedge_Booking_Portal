const WaitingPage = () => {
  return (
    <div className="flex flex-col justify-center items-start h-[80vh] p-4 md:p-10">
      <p className="text-lg font-bold text-start">Please wait </p>
      <h1 className="text-4xl md:text-6xl font-bold my-3 text-start">
        Your account is under <br /> review
      </h1>
      <p className="text-sm text-center">
        If you are facing any issues, please contact support.
      </p>
    </div>
  );
};

export default WaitingPage;
