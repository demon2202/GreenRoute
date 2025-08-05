import React from 'react';
import { IoClose } from 'react-icons/io5';

const AboutModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose}>
                    <IoClose />
                </button>
                <h2>About GreenRoute</h2>
                <p>
                    <strong>Version:</strong> 1.0.0
                </p>
                <p>
                    <strong>Description:</strong> GreenRoute is a web application that optimizes daily commutes by recommending the most eco-friendly routes using real-time public transit, bike-sharing, and carbon emission data.
                </p>
                <p>
                    This project was built to help urban commuters and environmentally conscious individuals reduce their carbon footprint while navigating cities efficiently.
                </p>
                <p>
                    <em>Thank you for using GreenRoute!</em>
                </p>
            </div>
        </div>
    );
};

export default AboutModal;