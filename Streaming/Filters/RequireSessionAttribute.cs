using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Telegram.Bot.Types.Enums;

namespace Streaming.Filters;

public class RequireSessionAttribute(params ChatMemberStatus[] allowedStatuses) : Attribute, IPageFilter
{
    private readonly ChatMemberStatus[] _allowedStatuses = allowedStatuses;

    public void OnPageHandlerSelected(PageHandlerSelectedContext context) { }

    public void OnPageHandlerExecuting(PageHandlerExecutingContext context)
    {
        var session = context.HttpContext.Session;
        if (string.IsNullOrWhiteSpace(session.GetString("UserId")))
        {
            context.Result = new RedirectResult("/Auth/Login");
        }
        else if (int.Parse(session.GetString("UserStatus")!) < 0)
        {
            // Пользователь ждет подтверждения администратором
            context.Result = new RedirectResult("/Pending");
        }
        else if (_allowedStatuses.Any() && !_allowedStatuses.Contains((ChatMemberStatus)int.Parse(session.GetString("UserStatus")!)))
        {
            context.Result = new RedirectResult("/Auth/Login");
        }
    }

    public void OnPageHandlerExecuted(PageHandlerExecutedContext context) { }
}
