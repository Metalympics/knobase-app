from setuptools import setup, find_packages

setup(
    name="knobase",
    version="1.0.0",
    description="Official Python SDK for the Knobase API",
    packages=find_packages(),
    python_requires=">=3.9",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)
