using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Telegram.Bot.Types.Enums;

namespace Streaming.Filters;

public class RequireTelegramSessionAttribute(params ChatMemberStatus[] allowedStatuses) : Attribute, IPageFilter
{
    private readonly ChatMemberStatus[] _allowedStatuses = allowedStatuses;

    public void OnPageHandlerSelected(PageHandlerSelectedContext context) { }

    public void OnPageHandlerExecuting(PageHandlerExecutingContext context)
    {
        var session = context.HttpContext.Session;
        if (string.IsNullOrWhiteSpace(session.GetString("TelegramUserId")))
        {
            context.Result = new RedirectResult("/Auth/Login");
        }
        else if (_allowedStatuses.Any() && !_allowedStatuses.Contains((ChatMemberStatus)int.Parse(session.GetString("TelegramStatus")!)))
        {
            context.Result = new RedirectResult("/Auth/Login");
        }
    }

    public void OnPageHandlerExecuted(PageHandlerExecutedContext context) { }
}
