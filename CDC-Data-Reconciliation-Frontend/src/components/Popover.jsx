import { useEffect, useRef, useState } from "react";

function Popover({
  children,
  content,
  trigger = "click"
}) {
  const [show, setShow] = useState(false);
  const wrapperRef = useRef(null);

  const handleMouseOver = () => {
    if (trigger === "hover") {
      setShow(true);
    };
  };

  const handleMouseLeft = () => {
    if (trigger === "hover") {
      setShow(false);
    };
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShow(false);
      }
    }

    if (show) {
      // Bind the event listener
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        // Unbind the event listener on clean up
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [show, wrapperRef]);

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={handleMouseOver}
      onMouseLeave={handleMouseLeft}
      className="w-fit h-fit absolute flex justify-center">
      <div
        onClick={(e) => {e.stopPropagation(); setShow(!show)}}
      >
        {children}
      </div>
      <div
        hidden={!show}
        className="absolute left-[100%]"> 
        <div className="rounded bg-white p-3 shadow-lg">
          {content}
        </div>
      </div>
    </div>
  );
};

export default Popover;