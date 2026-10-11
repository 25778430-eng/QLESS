export function Messages({ searchParams }: { searchParams?: { error?: string; notice?: string } }) {
  return (
    <>
      {searchParams?.error && <div className="error" role="alert">{searchParams.error}</div>}
      {searchParams?.notice && <div className="notice" role="status">{searchParams.notice}</div>}
    </>
  );
}
