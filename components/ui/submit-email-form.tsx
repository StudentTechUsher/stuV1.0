"use client";

import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import majors from "@/data/majors.json"; // Import majors JSON
import minors from "@/data/minors.json"; // Import minors JSON
import { Snackbar, Alert, Button, FormControlLabel, Radio, RadioGroup } from "@mui/material";
import { Geist_Mono } from "next/font/google";
import { X } from "lucide-react";
import Image from "next/image";

// Validation Schema
const schema = yup.object().shape({
  firstName: yup.string().required("First Name is required"),
  lastName: yup.string().required("Last Name is required"),
  university: yup.string().required("University Name is required"),
  email: yup.string().email("Invalid email").required("University Email is required"),
  major: yup.string().required("Desired Major is required"),
  secondMajor: yup.string().notRequired(),
  numberOfMinors: yup.number().min(0).max(3).required(),
  minors: yup.array().of(yup.string()).max(3, "You can select up to 3 minors"),
});

export function SubmitEmailForm() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      minors: [],
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [showSecondMajor, setShowSecondMajor] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Watch values for dynamic fields
  const numberOfMinors = watch("numberOfMinors");

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    console.log("Submitting form data:", JSON.stringify(data, null, 2));

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || "Failed to send email.");

      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error submitting form:", error);
      showSnackbar("Something went wrong. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 px-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* First Name & Last Name (Side by Side) */}
        <div className="flex space-x-2">
          <div className="flex-1">
            <Input type="text" placeholder="First Name" {...register("firstName")} />
            {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName.message}</p>}
          </div>
          <div className="flex-1">
            <Input type="text" placeholder="Last Name" {...register("lastName")} />
            {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName.message}</p>}
          </div>
        </div>

        {/* University Email */}
        <div>
          <Input type="email" placeholder="University Email" {...register("email")} />
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        </div>

        {/* University Dropdown */}
        <div>
          <select {...register("university")} className="w-full border border-gray-300 p-2 rounded-md">
            <option value="">Select Your University</option>
            <option value="BYU">Brigham Young University - Provo</option>
            <option value="UVU">Utah Valley University</option>
            <option value="UofU">University of Utah</option>
          </select>
          {errors.university && <p className="text-red-500 text-sm">{errors.university.message}</p>}
        </div>

        {/* Major Dropdown */}
        <div>
          <select {...register("major")} className="w-full border border-gray-300 p-2 rounded-md">
            <option value="">Select a Major</option>
            {majors.map((major) => (
              <option key={major.id} value={major.id}>
                {major.name}
              </option>
            ))}
          </select>
          {errors.major && <p className="text-red-500 text-sm">{errors.major.message}</p>}
          <Button
            type="button"
            onClick={() => setShowSecondMajor(!showSecondMajor)}
            className="font-body"
            sx={{
              color: "black",
              padding: 0,
            }}
          >
            {showSecondMajor ? "Remove Second Major" : "Add A Second Major"}
          </Button>
        </div>

        {/* Second Major dropdown */}
        {showSecondMajor && (
          <div>
            <select {...register("secondMajor")} className="w-full border border-gray-300 p-2 rounded-md">
              <option value="">Select a Second Major</option>
              {majors.map((major) => (
                <option key={major.id} value={major.id}>
                  {major.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Ask how many minors the user wants */}
        <div>
          <select {...register("numberOfMinors")} className="w-full border border-gray-300 p-2 rounded-md">
            <option value="">Select Number of Minors</option>
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </div>

        {/* Dynamically generated minor dropdowns */}
        {Array.from({ length: numberOfMinors }, (_, index) => (
          <div key={index}>
            <select {...register(`minors.${index}`)} className="w-full border border-gray-300 p-2 rounded-md">
              <option value="">Select a Minor</option>
              {minors.map((minor) => (
                <option key={minor.id} value={minor.id}>
                  {minor.name}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-primary hover:bg-primary-hover text-zinc-900 border-none font-medium py-2.5 rounded-md transition-all disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Join the Waitlist"}
        </button>
      </form>

      {/* Snackbar Component for Errors */}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity as "success" | "error"} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-300">
            {/* Close button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Content */}
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Icon */}
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <Image
                  src="/stu_icon_black.png"
                  alt="stu. logo"
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>

              {/* Message */}
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  You just joined the stu. V1 Waitlist!
                </h2>
                <p className="text-gray-600">
                  We'll be in touch soon with updates on your access.
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={() => setShowSuccessModal(false)}
                className="mt-4 w-full bg-primary hover:bg-primary-hover text-zinc-900 font-medium py-2.5 rounded-md transition-all"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
